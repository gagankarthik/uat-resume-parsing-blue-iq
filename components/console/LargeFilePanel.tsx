"use client";

import { useState } from "react";

import { ResumeResult } from "@/components/ResumeResult";
import { cn } from "@/components/ui";
import { createUploadUrl, getJobStatus, parseUploaded, uploadToS3 } from "@/lib/api";
import type { JobStatusResponse, ParseResponse, ParsedResume, UploadUrlResponse } from "@/lib/types";
import type { CallResult } from "@/lib/api";

import { Dropzone, EndpointHeader, JsonBlock, humanSize } from "./shared";

type StepState = "idle" | "running" | "ok" | "error";
interface Step { label: string; state: StepState; detail?: string }

const START: Step[] = [
  { label: "POST /resume/upload-url - request presigned URL", state: "idle" },
  { label: "PUT -> S3 - upload file directly", state: "idle" },
  { label: "POST /resume/parse-uploaded - parse", state: "idle" },
];

export function LargeFilePanel() {
  const [file, setFile] = useState<File | null>(null);
  const [steps, setSteps] = useState<Step[]>(START);
  const [presign, setPresign] = useState<UploadUrlResponse | null>(null);
  const [parsed, setParsed] = useState<ParseResponse | JobStatusResponse | null>(null);
  const [running, setRunning] = useState(false);

  function set(i: number, state: StepState, detail?: string) {
    setSteps((cur) => cur.map((s, idx) => (idx === i ? { ...s, state, detail } : s)));
  }

  async function run(f: File) {
    setFile(f);
    setSteps(START.map((s) => ({ ...s })));
    setPresign(null);
    setParsed(null);
    setRunning(true);
    try {
      // 1) presigned URL
      set(0, "running");
      const p = await createUploadUrl(f.name);
      if (!p.ok || !p.data) { set(0, "error", p.error ?? "failed"); return; }
      setPresign(p.data);
      set(0, "ok", `${p.status} - ${p.ms} ms - job ${p.data.job_id.slice(0, 8)}...`);

      // 2) direct S3 upload
      set(1, "running");
      const up = await uploadToS3(p.data.upload_url, p.data.fields, f);
      if (!up.ok) { set(1, "error", up.error ?? `S3 ${up.status}`); return; }
      set(1, "ok", `${up.status} - ${up.ms} ms`);

      // 3) parse-uploaded (+ poll if async)
      set(2, "running");
      const jobId = p.data.job_id;
      let r: CallResult<ParseResponse | JobStatusResponse> = await parseUploaded(jobId);
      if (r.ok && r.data?.status === "processing") {
        for (let i = 0; i < 90; i++) {
          await new Promise((res) => setTimeout(res, 2000));
          const jr = await getJobStatus(jobId);
          if (jr.ok && (jr.data?.status === "completed" || jr.data?.status === "failed")) { r = jr; break; }
        }
      }
      if (!r.ok) { set(2, "error", r.error ?? "failed"); return; }
      setParsed(r.data);
      set(2, "ok", `${r.status} - ${r.data?.status}`);
    } finally {
      setRunning(false);
    }
  }

  const data: ParsedResume | null = parsed?.data ?? null;

  return (
    <div>
      <EndpointHeader method="POST" path="/api/v1/resume/upload-url -> parse-uploaded" title="Large files (presigned upload)" blurb="For files beyond the ~6 MB request limit: request a presigned S3 URL, upload the file straight to storage, then parse it by job ID. The console runs all three steps for you." />

      {!running && !file && <Dropzone accept=".pdf,.docx,.rtf,.png,.jpg,.jpeg,.tiff,.tif,.webp" onFiles={(fs) => run(fs[0])} hint="large files supported" />}

      {file && (
        <div className="rounded-2xl border border-[var(--line)] bg-[var(--bg-elev)]/70 p-5 backdrop-blur">
          <div className="mb-4 flex items-center justify-between">
            <p className="truncate text-sm font-medium">{file.name} <span className="font-mono text-xs text-[var(--muted)]">- {humanSize(file.size)}</span></p>
            {!running && <button onClick={() => { setFile(null); setSteps(START); setParsed(null); setPresign(null); }} className="text-xs text-[var(--muted)] hover:text-accent-600 dark:hover:text-accent-400">Start over</button>}
          </div>
          <ol className="space-y-2.5">
            {steps.map((s, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className={cn(
                  "mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border text-[10px] font-bold transition-all",
                  s.state === "ok" ? "border-emerald-500 bg-emerald-500 text-white" :
                  s.state === "running" ? "border-accent-500 text-accent-600 dark:text-accent-400" :
                  s.state === "error" ? "border-red-500 bg-red-500 text-white" :
                  "border-[var(--line)] text-[var(--muted)]",
                )}>
                  {s.state === "ok" ? "ok" : s.state === "error" ? "!" : s.state === "running" ? <span className="h-2 w-2 animate-ping rounded-full bg-accent-500" /> : i + 1}
                </span>
                <div className="min-w-0">
                  <p className={cn("text-sm", s.state === "idle" ? "text-[var(--muted)]" : "text-[var(--fg)]")}>{s.label}</p>
                  {s.detail && <p className={cn("font-mono text-xs", s.state === "error" ? "text-red-600 dark:text-red-400" : "text-[var(--muted)]")}>{s.detail}</p>}
                </div>
              </li>
            ))}
          </ol>
          {steps[1].state === "error" && (
            <p className="mt-4 rounded-lg border border-amber-300/60 bg-amber-50/70 px-3 py-2 text-xs text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300">
              The direct S3 upload was blocked - this usually means the bucket needs a CORS rule allowing POST from this origin. The presigned URL itself was issued correctly (step 1).
            </p>
          )}
        </div>
      )}

      {data && (
        <div className="pop-in mt-5 rounded-2xl border border-[var(--line)] bg-[var(--bg-elev)]/80 p-5 shadow-lg shadow-black/5 backdrop-blur">
          <ResumeResult data={data} confidence={parsed?.confidence ?? null} skillsValidation={parsed?.skills_validation ?? null} />
        </div>
      )}

      {presign && (
        <details className="mt-4">
          <summary className="cursor-pointer select-none text-xs font-medium text-[var(--muted)] hover:text-accent-600 dark:hover:text-accent-400">Raw presign + parse response</summary>
          <div className="mt-3 space-y-3">
            <JsonBlock value={presign} max="max-h-64" />
            {parsed && <JsonBlock value={parsed} max="max-h-64" />}
          </div>
        </details>
      )}
    </div>
  );
}
