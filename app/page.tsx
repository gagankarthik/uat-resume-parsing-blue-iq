"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { ResumeResult } from "@/components/ResumeResult";
import { getJobStatus, parseResume } from "@/lib/api";
import { ApiError, type JobStatusResponse, type ParseResponse } from "@/lib/types";

type Result = ParseResponse | JobStatusResponse;

const ACCEPT = ".pdf,.docx,.png,.jpg,.jpeg,.tiff,.tif,.webp";
const FORMATS = ["PDF", "DOCX", "PNG", "JPG", "TIFF", "WEBP"];
const STAGES = ["Uploading file", "Extracting text", "Structuring with AI", "Finalizing"];

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
  const [file, setFile] = useState<File | null>(null);
  const [drag, setDrag] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [stage, setStage] = useState(0);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Advance the loader stages forward, holding on the last one until the result lands.
  useEffect(() => {
    if (phase !== "parsing") return;
    const id = setInterval(() => setStage((s) => Math.min(s + 1, STAGES.length - 1)), 1500);
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
      // The API base URL and key live entirely on the server (NEXT_PUBLIC_API_BASE_URL
      // and RESUME_PARSER_API_KEY) — the proxy attaches them. Nothing to collect here.
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
    [poll],
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
      {/* Hero */}
      <div className="mb-10 text-center">
        <span
          className="reveal inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-[var(--bg-elev)]/60 px-3 py-1 text-xs font-medium text-[var(--muted)] backdrop-blur"
          style={{ animationDelay: "0ms" }}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-teal-500" />
          Healthcare résumé extraction
        </span>
        <h1
          className="reveal mt-5 font-display text-5xl font-semibold leading-[1.05] tracking-tight sm:text-6xl"
          style={{ animationDelay: "80ms" }}
        >
          Résumé <span className="text-gradient italic">to structured JSON</span>
        </h1>
        <p
          className="reveal mx-auto mt-4 max-w-md text-[15px] leading-relaxed text-[var(--muted)]"
          style={{ animationDelay: "160ms" }}
        >
          Drop a résumé and the parser returns clean, reviewable fields — exactly what a
          client integration receives.
        </p>
      </div>

      {/* Dropzone / loader / result */}
      {phase === "parsing" ? (
        <Loader filename={file?.name} stageIndex={stage} />
      ) : phase === "done" && result ? (
        <ResultView filename={file?.name} result={result} onDownload={download} onReset={reset} />
      ) : (
        <div className="reveal" style={{ animationDelay: "240ms" }}>
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
              "group relative flex cursor-pointer flex-col items-center justify-center overflow-visible rounded-3xl border bg-[var(--bg-elev)]/70 px-6 py-16 text-center shadow-xl shadow-black/5 backdrop-blur-md transition-all duration-300 " +
              (drag
                ? "ring-glow scale-[1.01] border-transparent"
                : "border-[var(--line)] hover:-translate-y-0.5 hover:shadow-2xl hover:shadow-teal-500/10")
            }
          >
            <div className="relative">
              {drag && <span className="pulse-ring rounded-full" />}
              <UploadGlyph active={drag} />
            </div>
            <p className="mt-5 font-display text-xl font-medium tracking-tight">
              {drag ? "Release to parse" : "Drop your résumé here"}
            </p>
            <p className="mt-1.5 text-sm text-[var(--muted)]">
              or{" "}
              <span className="font-medium text-teal-600 underline-offset-4 group-hover:underline dark:text-teal-400">
                browse files
              </span>{" "}
              · up to 10 MB
            </p>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-1.5">
              {FORMATS.map((f) => (
                <span
                  key={f}
                  className="rounded-md border border-[var(--line)] bg-[var(--bg)]/60 px-2 py-0.5 font-mono text-[10px] font-medium tracking-wide text-[var(--muted)]"
                >
                  {f}
                </span>
              ))}
            </div>
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPT}
              className="hidden"
              onChange={(e) => pick(e.target.files?.[0] ?? null)}
            />
          </div>

          {error && (
            <div className="pop-in mt-4 flex items-start gap-2.5 rounded-xl border border-red-300/70 bg-red-50/80 px-4 py-3 text-sm text-red-700 backdrop-blur dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
              <svg className="mt-0.5 h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none">
                <path d="M12 9v4m0 4h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {error}
            </div>
          )}
          {file && !error && (
            <p className="mt-3 text-center text-xs text-[var(--muted)]">
              Last file: <span className="font-medium">{file.name}</span> · {humanSize(file.size)}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function Loader({ filename, stageIndex }: { filename?: string; stageIndex: number }) {
  return (
    <div className="pop-in rounded-3xl border border-[var(--line)] bg-[var(--bg-elev)]/70 p-10 shadow-xl shadow-black/5 backdrop-blur-md">
      <div className="mx-auto flex max-w-sm flex-col items-center">
        {/* Animated document scan */}
        <div className="animate-shimmer animate-float relative h-28 w-22 overflow-hidden rounded-lg border border-teal-300/70 bg-gradient-to-b from-teal-50 to-white shadow-lg shadow-teal-500/10 dark:border-teal-800/70 dark:from-teal-950/40 dark:to-zinc-900">
          <div className="space-y-2 p-3">
            {[14, 10, 13, 8, 12, 9].map((w, i) => (
              <div
                key={i}
                className="h-1.5 rounded-full bg-teal-200/80 dark:bg-teal-800/70"
                style={{ width: `${w * 6}%` }}
              />
            ))}
          </div>
          <div className="animate-scan absolute inset-x-1.5 h-[2px] rounded-full bg-teal-500 shadow-[0_0_10px_2px_rgba(20,184,166,0.7)]" />
        </div>

        <p className="mt-6 font-display text-lg font-medium tracking-tight">Parsing résumé</p>

        {/* Stage checklist */}
        <ul className="mt-4 w-full max-w-[15rem] space-y-2">
          {STAGES.map((s, i) => {
            const done = i < stageIndex;
            const active = i === stageIndex;
            return (
              <li key={s} className="flex items-center gap-2.5 text-sm">
                <span
                  className={
                    "grid h-5 w-5 shrink-0 place-items-center rounded-full border transition-all duration-300 " +
                    (done
                      ? "border-teal-500 bg-teal-500 text-white"
                      : active
                        ? "border-teal-500 text-teal-600 dark:text-teal-400"
                        : "border-[var(--line)] text-transparent")
                  }
                >
                  {done ? (
                    <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none">
                      <path d="m5 13 4 4L19 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ) : active ? (
                    <span className="h-2 w-2 animate-ping rounded-full bg-teal-500" />
                  ) : (
                    <span className="h-1.5 w-1.5 rounded-full bg-current" />
                  )}
                </span>
                <span
                  className={
                    done || active ? "text-[var(--fg)]" : "text-[var(--muted)]"
                  }
                >
                  {s}
                </span>
              </li>
            );
          })}
        </ul>

        {filename && <p className="mt-5 max-w-full truncate text-xs text-[var(--muted)]">{filename}</p>}
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
    <div className="pop-in rounded-3xl border border-[var(--line)] bg-[var(--bg-elev)]/80 p-5 shadow-xl shadow-black/5 backdrop-blur-md sm:p-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-100 px-2.5 py-1 text-xs font-semibold text-teal-700 dark:bg-teal-900/40 dark:text-teal-300">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-teal-500 opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-teal-500" />
            </span>
            Parsed
          </span>
          {filename && <span className="truncate text-xs text-[var(--muted)]">{filename}</span>}
        </div>
        <div className="flex gap-2">
          <ToolbarButton
            onClick={async () => {
              await navigator.clipboard.writeText(json);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            }}
          >
            {copied ? "Copied ✓" : "Copy"}
          </ToolbarButton>
          <button
            onClick={onDownload}
            className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-br from-teal-500 to-emerald-600 px-3.5 py-1.5 text-sm font-medium text-white shadow-md shadow-teal-500/20 transition-all hover:shadow-lg hover:shadow-teal-500/30 active:scale-95"
          >
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
              <path d="M12 4v11m0 0 4-4m-4 4-4-4M5 20h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            JSON
          </button>
          <ToolbarButton onClick={onReset}>Parse another</ToolbarButton>
        </div>
      </div>
      {result.data ? (
        <ResumeResult data={result.data} confidence={result.confidence} skillsValidation={result.skills_validation} />
      ) : (
        <p className="text-sm text-[var(--muted)]">No parsed data returned.</p>
      )}
    </div>
  );
}

function ToolbarButton({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="rounded-lg border border-[var(--line)] bg-[var(--bg-elev)] px-3 py-1.5 text-sm font-medium text-[var(--fg)] transition-colors hover:border-teal-400 hover:text-teal-600 active:scale-95 dark:hover:text-teal-400"
    >
      {children}
    </button>
  );
}

function UploadGlyph({ active }: { active: boolean }) {
  return (
    <div
      className={
        "relative grid h-16 w-16 place-items-center rounded-2xl transition-all duration-300 " +
        (active
          ? "scale-110 bg-gradient-to-br from-teal-500 to-emerald-600 text-white shadow-lg shadow-teal-500/30"
          : "bg-teal-50 text-teal-600 group-hover:scale-105 dark:bg-teal-950/50 dark:text-teal-400")
      }
    >
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className={active ? "" : "animate-float"}>
        <path d="M12 16V4m0 0L7 9m5-5 5 5M5 19h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}
