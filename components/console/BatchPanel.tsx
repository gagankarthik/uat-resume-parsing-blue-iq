"use client";

import { useEffect, useRef, useState } from "react";

import { ResumeResult } from "@/components/ResumeResult";
import { Button } from "@/components/ui";
import { batchParse, getBatchStatus, getJobStatus, type CallResult } from "@/lib/api";
import type { BatchJob, BatchStatusResponse, BatchSubmitResponse, JobStatusResponse } from "@/lib/types";

import { CopyButton, Dropzone, EndpointHeader, JsonBlock, StatusPill, humanSize } from "./shared";

// One accepted file, paired with whatever the job endpoint returned for it.
type FileResult = { job: BatchJob; res: CallResult<JobStatusResponse> };

export function BatchPanel() {
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submit, setSubmit] = useState<CallResult<BatchSubmitResponse> | null>(null);
  const [status, setStatus] = useState<CallResult<BatchStatusResponse> | null>(null);
  const [polling, setPolling] = useState(false);
  const [results, setResults] = useState<FileResult[] | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  function reset() {
    setFiles([]);
    setSubmit(null);
    setStatus(null);
    setResults(null);
  }

  // The batch endpoint only reports counts. To actually SEE what came back, fetch
  // each accepted file's job once the batch settles — that's the parsed résumé.
  async function loadResults(jobs: BatchJob[]) {
    const rows = await Promise.all(
      jobs.map(async (job) => ({ job, res: await getJobStatus(job.job_id) })),
    );
    setResults(rows);
  }

  async function pollStatus(batchId: string, jobs: BatchJob[]) {
    setPolling(true);
    for (let i = 0; i < 200; i++) {
      const r = await getBatchStatus(batchId);
      setStatus(r);
      if (!r.ok || (r.data && r.data.status !== "processing")) break;
      await new Promise((res) => (timer.current = setTimeout(res, 2500)));
    }
    setPolling(false);
    await loadResults(jobs);
  }

  async function submitBatch() {
    if (files.length === 0) return;
    setSubmitting(true);
    setStatus(null);
    setResults(null);
    const r = await batchParse(files);
    setSubmit(r);
    setSubmitting(false);
    if (r.ok && r.data?.batch_id) pollStatus(r.data.batch_id, r.data.jobs ?? []);
  }

  const st = status?.data;
  const done = st ? st.completed + st.failed : 0;
  const pct = st && st.total ? Math.round((done / st.total) * 100) : 0;

  return (
    <div>
      <EndpointHeader method="POST" path="/api/v1/resume/batch" title="Batch parse" blurb="Upload many resumes at once. The API accepts them, returns a batch ID and per-file job IDs, and processes asynchronously — the console polls the batch until every file finishes." />

      {files.length === 0 ? (
        <Dropzone accept=".pdf,.docx,.rtf,.png,.jpg,.jpeg,.tiff,.tif,.webp" multiple onFiles={setFiles} hint="select multiple files" />
      ) : (
        <div className="rounded-2xl border border-[var(--line)] bg-[var(--bg-elev)]/70 p-4 backdrop-blur">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-medium">{files.length} file{files.length > 1 ? "s" : ""} selected</p>
            <button onClick={reset} className="text-xs text-[var(--muted)] hover:text-accent-600 dark:hover:text-accent-400">Clear</button>
          </div>
          <ul className="scroll-fine max-h-40 space-y-1.5 overflow-auto">
            {files.map((f, i) => (
              <li key={i} className="flex items-center justify-between gap-3 rounded-lg border border-[var(--line)] bg-[var(--bg)]/50 px-3 py-1.5 text-sm">
                <span className="truncate">{f.name}</span>
                <span className="shrink-0 font-mono text-xs text-[var(--muted)]">{humanSize(f.size)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-4">
            <Button onClick={submitBatch} loading={submitting}>{submitting ? "Submitting…" : `Submit ${files.length} files`}</Button>
          </div>
        </div>
      )}

      {submit && (
        <div className="pop-in mt-5 overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--bg-elev)]/80 shadow-lg shadow-black/5 backdrop-blur">
          <div className="flex items-center justify-between gap-3 border-b border-[var(--line)] px-4 py-3">
            <div className="flex items-center gap-3">
              <StatusPill status={submit.status} ms={submit.ms} />
              <span className="text-sm font-medium">Batch submitted</span>
            </div>
            {submit.data?.batch_id && <CopyButton text={submit.data.batch_id} label="Copy batch ID" />}
          </div>
          <div className="space-y-4 p-4">
            {submit.data && (
              <>
                <div className="grid grid-cols-3 gap-3">
                  <Metric label="Accepted" value={submit.data.total} tone="emerald" />
                  <Metric label="Skipped" value={submit.data.skipped} tone={submit.data.skipped ? "amber" : "zinc"} />
                  <Metric label="Job IDs" value={submit.data.job_ids?.length ?? 0} tone="teal" />
                </div>

                {st && (
                  <div>
                    <div className="mb-1.5 flex items-center justify-between text-xs text-[var(--muted)]">
                      <span className="font-medium capitalize text-[var(--fg)]">
                        {polling && <span className="mr-1.5 inline-block h-2 w-2 animate-pulse rounded-full bg-accent-500 align-middle" />}
                        {st.status}
                      </span>
                      <span className="font-mono">{done}/{st.total} · {st.failed} failed</span>
                    </div>
                    <div className="h-2.5 w-full overflow-hidden rounded-full bg-[var(--line)]">
                      <div className="h-full rounded-full bg-accent-600 transition-all duration-500" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )}

                {submit.data.skipped_files?.length > 0 && (
                  <div className="rounded-xl border border-amber-300/60 bg-amber-50/70 p-3 text-sm dark:border-amber-900/50 dark:bg-amber-950/30">
                    <p className="mb-1.5 font-medium text-amber-700 dark:text-amber-300">Skipped files</p>
                    <ul className="space-y-1">
                      {submit.data.skipped_files.map((s, i) => (
                        <li key={i} className="text-amber-700/90 dark:text-amber-300/90"><span className="font-mono text-xs">{s.filename}</span> — {s.reason}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {results && <Results rows={results} />}
              </>
            )}
            {!submit.ok && submit.error && <p className="text-sm text-red-600 dark:text-red-400">{submit.error}</p>}
            <details>
              <summary className="cursor-pointer select-none text-xs font-medium text-[var(--muted)] hover:text-accent-600 dark:hover:text-accent-400">Raw JSON (submit + latest status)</summary>
              <div className="mt-3 space-y-3">
                <JsonBlock value={submit.raw} max="max-h-64" />
                {status && <JsonBlock value={status.raw} max="max-h-64" />}
              </div>
            </details>
          </div>
        </div>
      )}
    </div>
  );
}

const JOB_TONES: Record<string, string> = {
  completed: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
  partial: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
  failed: "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300",
};

function JobBadge({ status }: { status: string }) {
  const tone = JOB_TONES[status] ?? "bg-[var(--line)] text-[var(--muted)]";
  return (
    <span className={"rounded-full px-2 py-0.5 text-[11px] font-medium " + tone}>{status}</span>
  );
}

/** Per-file outcomes: the parsed résumé for each accepted file, expandable. */
function Results({ rows }: { rows: FileResult[] }) {
  if (rows.length === 0) return null;

  return (
    <div>
      <p className="mb-2 text-sm font-medium">Parsed results</p>
      <ul className="space-y-2">
        {rows.map(({ job, res }) => {
          const data = res.data?.data ?? null;
          const jobStatus = res.ok ? (res.data?.status ?? "unknown") : "failed";
          const error = res.data?.error ?? res.error;

          return (
            <li key={job.job_id} className="overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--bg)]/50">
              <details>
                <summary className="flex cursor-pointer select-none items-center justify-between gap-3 px-3 py-2">
                  <span className="truncate text-sm">{job.filename}</span>
                  <JobBadge status={jobStatus} />
                </summary>
                <div className="border-t border-[var(--line)] p-4">
                  {data ? (
                    <ResumeResult
                      data={data}
                      confidence={res.data?.confidence ?? null}
                      skillsValidation={res.data?.skills_validation ?? null}
                    />
                  ) : (
                    <p className="text-sm text-red-600 dark:text-red-400">
                      {error ?? "No data returned for this file."}
                    </p>
                  )}
                </div>
              </details>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Metric({ label, value, tone }: { label: string; value: number; tone: "emerald" | "amber" | "teal" | "zinc" }) {
  const tones = {
    emerald: "text-emerald-600 dark:text-emerald-400",
    amber: "text-amber-600 dark:text-amber-400",
    teal: "text-accent-600 dark:text-accent-400",
    zinc: "text-[var(--fg)]",
  };
  return (
    <div className="rounded-xl border border-[var(--line)] bg-[var(--bg)]/50 px-4 py-3 text-center">
      <p className={"font-display text-2xl font-semibold " + tones[tone]}>{value}</p>
      <p className="mt-0.5 text-[11px] font-medium uppercase tracking-wider text-[var(--muted)]">{label}</p>
    </div>
  );
}
