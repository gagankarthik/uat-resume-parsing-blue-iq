"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { ResumeResult } from "@/components/ResumeResult";
import { Button } from "@/components/ui";
import { getJobStatus, parseResume, type CallResult } from "@/lib/api";
import type { JobStatusResponse, ParseResponse } from "@/lib/types";

import { CopyButton, Dropzone, EndpointHeader, JsonBlock, StatusPill, humanSize } from "./shared";

type Body = ParseResponse | JobStatusResponse;
type Phase = "idle" | "parsing" | "done";

const ACCEPT = ".pdf,.docx,.rtf,.png,.jpg,.jpeg,.tiff,.tif,.webp";
const STAGES = ["Uploading file", "Extracting text", "Structuring with AI", "Finalizing"];

export function ParsePanel() {
  const [file, setFile] = useState<File | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [stage, setStage] = useState(0);
  const [result, setResult] = useState<CallResult<Body> | null>(null);

  useEffect(() => {
    if (phase !== "parsing") return;
    const id = setInterval(() => setStage((s) => Math.min(s + 1, STAGES.length - 1)), 1500);
    return () => clearInterval(id);
  }, [phase]);

  const poll = useCallback(async (jobId: string): Promise<CallResult<Body>> => {
    for (let i = 0; i < 90; i++) {
      await new Promise((r) => setTimeout(r, 2000));
      const jr = await getJobStatus(jobId);
      if (!jr.ok) return jr as CallResult<Body>;
      const st = jr.data?.status;
      if (st === "completed" || st === "failed") return jr as CallResult<Body>;
    }
    return { ok: false, status: 0, ms: 0, data: null, error: "Timed out waiting for the result.", raw: { error: { detail: "poll timeout" } } };
  }, []);

  const run = useCallback(
    async (f: File) => {
      setFile(f);
      setResult(null);
      setStage(0);
      setPhase("parsing");
      let res: CallResult<Body> = await parseResume(f);
      if (res.ok && res.data?.status === "processing" && res.data.job_id) {
        res = await poll(res.data.job_id);
      }
      setResult(res);
      setPhase("done");
    },
    [poll],
  );

  const body = result?.data as Body | null;
  const parsed = body?.data ?? null;

  return (
    <div>
      <EndpointHeader
        method="POST"
        path="/api/v1/resume/parse"
        title="Parse a résumé"
        blurb="Upload a single résumé. Digital PDF/DOCX/RTF return structured JSON synchronously; scanned PDFs and images return a job that the console polls to completion."
      />

      {phase === "parsing" ? (
        <Loader filename={file?.name} stageIndex={stage} />
      ) : phase === "done" && result ? (
        <div className="pop-in">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <StatusPill status={result.status} ms={result.ms} />
              {file && <span className="truncate text-xs text-[var(--muted)]">{file.name} · {humanSize(file.size)}</span>}
            </div>
            <div className="flex gap-2">
              <CopyButton text={JSON.stringify(result.raw, null, 2)} label="Copy JSON" />
              <Button variant="secondary" className="h-8 px-3 text-xs" onClick={() => { setPhase("idle"); setResult(null); setFile(null); }}>
                Parse another
              </Button>
            </div>
          </div>
          {parsed ? (
            <div className="rounded-2xl border border-[var(--line)] bg-[var(--bg-elev)]/80 p-5 shadow-lg shadow-black/5 backdrop-blur">
              <ResumeResult data={parsed} confidence={body?.confidence ?? null} skillsValidation={body?.skills_validation ?? null} />
            </div>
          ) : (
            !result.ok && (
              <div className="rounded-xl border border-red-300/70 bg-red-50/80 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
                {result.error}
              </div>
            )
          )}
          <details className="mt-4 group">
            <summary className="cursor-pointer select-none text-xs font-medium text-[var(--muted)] hover:text-accent-600 dark:hover:text-accent-400">Raw JSON response</summary>
            <div className="mt-3">
              <JsonBlock value={result.raw} />
            </div>
          </details>
        </div>
      ) : (
        <Dropzone accept={ACCEPT} onFiles={(fs) => run(fs[0])} hint="PDF · DOCX · RTF · PNG · JPG · TIFF · WEBP · up to 10 MB" />
      )}
    </div>
  );
}

function Loader({ filename, stageIndex }: { filename?: string; stageIndex: number }) {
  return (
    <div className="pop-in rounded-2xl border border-[var(--line)] bg-[var(--bg-elev)]/70 p-10 shadow-lg shadow-black/5 backdrop-blur">
      <div className="mx-auto flex max-w-sm flex-col items-center">
        <div className="animate-shimmer animate-float relative h-28 w-22 overflow-hidden rounded-lg border border-accent-300/70 bg-accent-50 shadow-lg shadow-accent-500/10 dark:border-accent-800/70 dark:from-accent-950/40 dark:to-zinc-900">
          <div className="space-y-2 p-3">
            {[14, 10, 13, 8, 12, 9].map((w, i) => (
              <div key={i} className="h-1.5 rounded-full bg-accent-200/80 dark:bg-accent-800/70" style={{ width: `${w * 6}%` }} />
            ))}
          </div>
          <div className="animate-scan absolute inset-x-1.5 h-[2px] rounded-full bg-accent-500 shadow-[0_0_10px_2px_rgba(20,184,166,0.7)]" />
        </div>
        <p className="mt-6 font-display text-lg font-medium tracking-tight">Parsing résumé</p>
        <ul className="mt-4 w-full max-w-[15rem] space-y-2">
          {STAGES.map((s, i) => {
            const done = i < stageIndex;
            const active = i === stageIndex;
            return (
              <li key={s} className="flex items-center gap-2.5 text-sm">
                <span className={"grid h-5 w-5 shrink-0 place-items-center rounded-full border transition-all duration-300 " + (done ? "border-accent-500 bg-accent-500 text-white" : active ? "border-accent-500 text-accent-600 dark:text-accent-400" : "border-[var(--line)] text-transparent")}>
                  {done ? (
                    <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none"><path d="m5 13 4 4L19 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  ) : active ? (
                    <span className="h-2 w-2 animate-ping rounded-full bg-accent-500" />
                  ) : (
                    <span className="h-1.5 w-1.5 rounded-full bg-current" />
                  )}
                </span>
                <span className={done || active ? "text-[var(--fg)]" : "text-[var(--muted)]"}>{s}</span>
              </li>
            );
          })}
        </ul>
        {filename && <p className="mt-5 max-w-full truncate text-xs text-[var(--muted)]">{filename}</p>}
      </div>
    </div>
  );
}
