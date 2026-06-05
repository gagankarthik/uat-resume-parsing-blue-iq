"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { ResumeResult } from "@/components/ResumeResult";
import { getJobStatus, parseResume } from "@/lib/api";
import { DEFAULT_BASE_URL, getSettings, saveSettings } from "@/lib/settings";
import { ApiError, type JobStatusResponse, type ParseResponse } from "@/lib/types";

type Result = ParseResponse | JobStatusResponse;

const ACCEPT = ".pdf,.docx,.png,.jpg,.jpeg,.tiff,.tif,.webp";
const STAGES = ["Uploading file…", "Extracting text…", "Structuring with AI…", "Finalizing…"];

type Phase = "idle" | "parsing" | "done" | "error";

function errMsg(e: unknown): string {
  if (e instanceof ApiError) return e.message;
  if (e instanceof Error) return e.message;
  return "Unexpected error";
}
function humanSize(b: number): string {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / (1024 * 1024)).toFixed(2)} MB`;
}

export default function Home() {
  const [apiKey, setApiKey] = useState("");
  const [baseUrl, setBaseUrl] = useState(DEFAULT_BASE_URL);
  const [showKey, setShowKey] = useState(false);

  const [file, setFile] = useState<File | null>(null);
  const [drag, setDrag] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [stage, setStage] = useState(0);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const s = getSettings();
    setApiKey(s.apiKey);
    setBaseUrl(s.apiBaseUrl);
  }, []);

  // Cycle the loader status text while parsing.
  useEffect(() => {
    if (phase !== "parsing") return;
    const id = setInterval(() => setStage((s) => (s + 1) % STAGES.length), 1400);
    return () => clearInterval(id);
  }, [phase]);

  const poll = useCallback(async (jobId: string) => {
    for (let i = 0; i < 90; i++) {
      await new Promise((r) => setTimeout(r, 2000));
      const jr = await getJobStatus(jobId);
      if (jr.status === "completed") return jr;
      if (jr.status === "failed") throw new Error(jr.error || "Parsing failed");
    }
    throw new Error("Timed out waiting for the result.");
  }, []);

  const run = useCallback(
    async (f: File) => {
      // API key is optional here — the server proxy supplies it from .env when
      // RESUME_PARSER_API_KEY is set. A missing key surfaces as a 401 from the API.
      saveSettings({ apiBaseUrl: baseUrl.trim() || DEFAULT_BASE_URL, apiKey: apiKey.trim() });
      setError("");
      setResult(null);
      setStage(0);
      setPhase("parsing");
      try {
        let res: Result = await parseResume(f);
        if (res.status === "processing") res = await poll(res.job_id);
        setResult(res);
        setPhase("done");
      } catch (e) {
        setError(errMsg(e));
        setPhase("error");
      }
    },
    [apiKey, baseUrl, poll],
  );

  function pick(f: File | null) {
    if (!f) return;
    setFile(f);
    run(f);
  }

  function download() {
    const payload = result?.data ?? result;
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = (file?.name?.replace(/\.[^.]+$/, "") || "resume") + ".json";
    a.click();
    URL.revokeObjectURL(url);
  }

  function reset() {
    setFile(null);
    setResult(null);
    setError("");
    setPhase("idle");
  }

  return (
    <div className="mx-auto w-full max-w-2xl">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-semibold tracking-tight">Résumé Parser</h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          Drop a résumé — the API turns it into structured JSON you can download.
        </p>
      </div>

      {/* API key */}
      <div className="mb-5 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">API key</label>
        <div className="flex gap-2">
          <input
            type={showKey ? "text" : "password"}
            value={apiKey}
            placeholder="rp_live_…"
            onChange={(e) => setApiKey(e.target.value)}
            onBlur={() => saveSettings({ apiBaseUrl: baseUrl.trim() || DEFAULT_BASE_URL, apiKey: apiKey.trim() })}
            className="h-10 w-full rounded-lg border border-zinc-300 bg-white px-3 font-mono text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-zinc-700 dark:bg-zinc-950"
          />
          <button
            onClick={() => setShowKey((v) => !v)}
            className="shrink-0 rounded-lg border border-zinc-300 px-3 text-sm font-medium hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
          >
            {showKey ? "Hide" : "Show"}
          </button>
        </div>
        <p className="mt-1.5 text-xs text-zinc-500 dark:text-zinc-400">
          Sent as <code className="font-mono">X-API-Key</code>, stored only in your browser. Leave blank to use the
          server&apos;s <code className="font-mono">.env</code> key (<code className="font-mono">RESUME_PARSER_API_KEY</code>).
        </p>
      </div>

      {/* Dropzone / loader / result */}
      {phase === "parsing" ? (
        <Loader filename={file?.name} stage={STAGES[stage]} />
      ) : phase === "done" && result ? (
        <ResultView
          filename={file?.name}
          result={result}
          onDownload={download}
          onReset={reset}
        />
      ) : (
        <>
          <div
            role="button"
            tabIndex={0}
            onClick={() => inputRef.current?.click()}
            onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && inputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDrag(true);
            }}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDrag(false);
              pick(e.dataTransfer.files?.[0] ?? null);
            }}
            className={
              "flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-16 text-center transition-colors " +
              (drag
                ? "border-indigo-500 bg-indigo-50/60 dark:bg-indigo-950/30"
                : "border-zinc-300 bg-white hover:border-indigo-400 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800/50")
            }
          >
            <UploadGlyph />
            <p className="mt-4 text-base font-medium">
              {drag ? "Drop to parse" : "Drag & drop a résumé"}
            </p>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">or click to browse · PDF, DOCX, image · up to 10 MB</p>
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPT}
              className="hidden"
              onChange={(e) => pick(e.target.files?.[0] ?? null)}
            />
          </div>
          {error && (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
              {error}
            </div>
          )}
          {file && (
            <p className="mt-3 text-center text-xs text-zinc-500">
              Last file: {file.name} · {humanSize(file.size)}
            </p>
          )}
        </>
      )}
    </div>
  );
}

function Loader({ filename, stage }: { filename?: string; stage: string }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-10 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mx-auto flex max-w-xs flex-col items-center text-center">
        {/* Animated document scan */}
        <div className="animate-shimmer relative h-24 w-20 overflow-hidden rounded-md border-2 border-indigo-300 bg-indigo-50 dark:border-indigo-800 dark:bg-indigo-950/40">
          <div className="space-y-1.5 p-2.5">
            {[10, 14, 8, 12, 9].map((w, i) => (
              <div key={i} className="h-1.5 rounded bg-indigo-200 dark:bg-indigo-800" style={{ width: `${w * 6}%` }} />
            ))}
          </div>
          <div className="animate-scan absolute left-1 right-1 h-0.5 rounded bg-indigo-500 shadow-[0_0_8px_2px_rgba(99,102,241,0.6)]" />
        </div>
        <p className="mt-5 text-base font-medium">Parsing résumé…</p>
        <p className="mt-1 text-sm text-indigo-600 dark:text-indigo-400">{stage}</p>
        {filename && <p className="mt-2 truncate text-xs text-zinc-400">{filename}</p>}
      </div>
    </div>
  );
}

function ResultView({
  filename,
  result,
  onDownload,
  onReset,
}: {
  filename?: string;
  result: Result;
  onDownload: () => void;
  onReset: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const json = JSON.stringify(result.data ?? result, null, 2);
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/40 dark:text-green-300">
            <span className="h-1.5 w-1.5 rounded-full bg-green-500" /> Parsed
          </span>
          {filename && <span className="truncate text-xs text-zinc-500">{filename}</span>}
        </div>
        <div className="flex gap-2">
          <button
            onClick={async () => {
              await navigator.clipboard.writeText(json);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            }}
            className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
          >
            {copied ? "Copied ✓" : "Copy"}
          </button>
          <button onClick={onDownload} className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-500">
            Download JSON
          </button>
          <button onClick={onReset} className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800">
            Parse another
          </button>
        </div>
      </div>
      {result.data ? (
        <ResumeResult data={result.data} confidence={result.confidence} skillsValidation={result.skills_validation} />
      ) : (
        <p className="text-sm text-zinc-500">No parsed data returned.</p>
      )}
    </div>
  );
}

function UploadGlyph() {
  return (
    <div className="grid h-14 w-14 place-items-center rounded-full bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400">
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
        <path d="M12 16V4m0 0L7 9m5-5 5 5M5 19h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}
