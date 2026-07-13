"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { ResumeResult } from "@/components/ResumeResult";
import { Button } from "@/components/ui";
import { batchParse, getBatchStatus, getJobStatus, type CallResult } from "@/lib/api";
import type {
  BatchJob,
  BatchSkipped,
  BatchStatusResponse,
  BatchSubmitResponse,
  JobStatusResponse,
} from "@/lib/types";

import { CopyButton, Dropzone, EndpointHeader, JsonBlock, StatusPill, humanSize } from "./shared";

// One accepted file, paired with whatever the job endpoint has returned for it so far.
type FileResult = { job: BatchJob; res: CallResult<JobStatusResponse> | null };

// A row in the left-hand list. Skipped files are shown too - they were part of the
// submission, and a console that silently omits them is lying about what you sent.
type Row =
  | { kind: "job"; key: string; filename: string; result: FileResult }
  | { kind: "skipped"; key: string; filename: string; reason: string };

const TERMINAL = new Set(["completed", "partial", "failed"]);

function isTerminal(r: FileResult): boolean {
  return !!r.res && (!r.res.ok || TERMINAL.has(r.res.data?.status ?? ""));
}

export function BatchPanel() {
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submit, setSubmit] = useState<CallResult<BatchSubmitResponse> | null>(null);
  const [status, setStatus] = useState<CallResult<BatchStatusResponse> | null>(null);
  const [polling, setPolling] = useState(false);
  const [results, setResults] = useState<Record<string, FileResult>>({});
  const [selected, setSelected] = useState<string | null>(null);
  const [view, setView] = useState<"parsed" | "json">("parsed");
  const [filter, setFilter] = useState("");

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancelled = useRef(false);

  useEffect(() => () => {
    cancelled.current = true;
    if (timer.current) clearTimeout(timer.current);
  }, []);

  function reset() {
    cancelled.current = true;
    setFiles([]);
    setSubmit(null);
    setStatus(null);
    setResults({});
    setSelected(null);
    setFilter("");
  }

  /**
   * Poll the batch until every file is terminal.
   *
   * Each resume's result is fetched and shown AS IT LANDS, rather than waiting for the
   * whole batch to settle - on a 50-file batch that is the difference between a blank
   * panel for two minutes and a list that fills in front of you. Only jobs that are
   * still running get re-fetched each tick, so a finished batch stops costing requests.
   */
  async function pollUntilDone(batchId: string, jobs: BatchJob[]) {
    cancelled.current = false;
    setPolling(true);

    // Seed the list immediately so every filename is visible while it parses.
    setResults(Object.fromEntries(jobs.map((job) => [job.job_id, { job, res: null }])));

    const live: Record<string, FileResult> = Object.fromEntries(
      jobs.map((job) => [job.job_id, { job, res: null } as FileResult]),
    );

    for (let tick = 0; tick < 240 && !cancelled.current; tick++) {
      const batch = await getBatchStatus(batchId);
      if (cancelled.current) break;
      setStatus(batch);

      const outstanding = jobs.filter((j) => !isTerminal(live[j.job_id]));
      if (outstanding.length > 0) {
        const fetched = await Promise.all(
          outstanding.map(async (job) => ({ job, res: await getJobStatus(job.job_id) })),
        );
        if (cancelled.current) break;
        for (const row of fetched) live[row.job.job_id] = row;
        setResults({ ...live });
      }

      const allDone = jobs.every((j) => isTerminal(live[j.job_id]));
      const batchDone = !batch.ok || (batch.data && batch.data.status !== "processing");
      if (allDone && batchDone) break;

      await new Promise((res) => (timer.current = setTimeout(res, 2500)));
    }
    setPolling(false);
  }

  async function submitBatch() {
    if (files.length === 0) return;
    setSubmitting(true);
    setStatus(null);
    setResults({});
    setSelected(null);
    const r = await batchParse(files);
    setSubmit(r);
    setSubmitting(false);
    if (r.ok && r.data?.batch_id) pollUntilDone(r.data.batch_id, r.data.jobs ?? []);
  }

  const skippedFiles = submit?.data?.skipped_files;

  const rows: Row[] = useMemo(() => {
    const skipped: BatchSkipped[] = skippedFiles ?? [];
    const jobRows: Row[] = Object.values(results).map((result) => ({
      kind: "job",
      key: result.job.job_id,
      filename: result.job.filename,
      result,
    }));
    const skippedRows: Row[] = skipped.map((s, i) => ({
      kind: "skipped",
      key: `skipped-${i}`,
      filename: s.filename,
      reason: s.reason,
    }));
    return [...jobRows, ...skippedRows];
  }, [results, skippedFiles]);

  const visible = useMemo(() => {
    const q = filter.trim().toLowerCase();
    return q ? rows.filter((r) => r.filename.toLowerCase().includes(q)) : rows;
  }, [rows, filter]);

  // The detail pane defaults to the first resume that has data, so it is never empty
  // while results stream in. This is DERIVED, not stored: setting it from an effect
  // would be a cascading render (React 19 rejects setState-in-effect outright), and
  // storing a default the user has not chosen means a later click can't override it.
  const fallback = Object.values(results).find((r) => r.res?.data?.data)?.job.job_id ?? null;
  const activeKey = selected ?? fallback;
  const active = activeKey ? results[activeKey] : undefined;

  const st = status?.data;
  const done = st ? st.completed + st.failed : 0;
  const pct = st && st.total ? Math.round((done / st.total) * 100) : 0;

  return (
    <div>
      <EndpointHeader
        method="POST"
        path="/api/v1/resume/batch"
        title="Batch parse"
        blurb="Upload many resumes at once. The API accepts them, returns a batch ID and a job ID per file, and parses asynchronously. Every file appears in the list below and fills in as it finishes - pick one to inspect its parsed record or raw JSON."
      />

      {files.length === 0 && !submit ? (
        <Dropzone
          accept=".pdf,.docx,.rtf,.png,.jpg,.jpeg,.tiff,.tif,.webp"
          multiple
          onFiles={setFiles}
          hint="select multiple files"
        />
      ) : null}

      {files.length > 0 && !submit && (
        <div className="rounded-2xl border border-[var(--line)] bg-[var(--bg-elev)]/70 p-4 backdrop-blur">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-medium">
              {files.length} file{files.length > 1 ? "s" : ""} selected
            </p>
            <button
              onClick={reset}
              className="text-xs text-[var(--muted)] hover:text-accent-600 dark:hover:text-accent-400"
            >
              Clear
            </button>
          </div>
          <ul className="scroll-fine max-h-40 space-y-1.5 overflow-auto">
            {files.map((f, i) => (
              <li
                key={i}
                className="flex items-center justify-between gap-3 rounded-lg border border-[var(--line)] bg-[var(--bg)]/50 px-3 py-1.5 text-sm"
              >
                <span className="truncate">{f.name}</span>
                <span className="shrink-0 font-mono text-xs text-[var(--muted)]">
                  {humanSize(f.size)}
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-4">
            <Button onClick={submitBatch} loading={submitting}>
              {submitting ? "Submitting..." : `Submit ${files.length} file${files.length > 1 ? "s" : ""}`}
            </Button>
          </div>
        </div>
      )}

      {submit && (
        <div className="pop-in mt-5 space-y-4">
          {/* Summary header */}
          <div className="overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--bg-elev)]/80 shadow-lg shadow-black/5 backdrop-blur">
            <div className="flex items-center justify-between gap-3 border-b border-[var(--line)] px-4 py-3">
              <div className="flex items-center gap-3">
                <StatusPill status={submit.status} ms={submit.ms} />
                <span className="text-sm font-medium">Batch submitted</span>
              </div>
              <div className="flex items-center gap-2">
                {submit.data?.batch_id && (
                  <CopyButton text={submit.data.batch_id} label="Copy batch ID" />
                )}
                <button
                  onClick={reset}
                  className="rounded-lg border border-[var(--line)] px-2.5 py-1 text-xs text-[var(--muted)] hover:text-accent-600 dark:hover:text-accent-400"
                >
                  New batch
                </button>
              </div>
            </div>

            <div className="space-y-4 p-4">
              {submit.data && (
                <div className="grid grid-cols-3 gap-3">
                  <Metric label="Accepted" value={submit.data.total} tone="emerald" />
                  <Metric
                    label="Skipped"
                    value={submit.data.skipped}
                    tone={submit.data.skipped ? "amber" : "zinc"}
                  />
                  <Metric label="Failed" value={st?.failed ?? 0} tone={st?.failed ? "amber" : "zinc"} />
                </div>
              )}

              {st && (
                <div>
                  <div className="mb-1.5 flex items-center justify-between text-xs text-[var(--muted)]">
                    <span className="font-medium capitalize text-[var(--fg)]">
                      {polling && (
                        <span className="mr-1.5 inline-block h-2 w-2 animate-pulse rounded-full bg-accent-500 align-middle" />
                      )}
                      {st.status}
                    </span>
                    <span className="font-mono">
                      {done}/{st.total} - {st.failed} failed
                    </span>
                  </div>
                  <div className="h-2.5 w-full overflow-hidden rounded-full bg-[var(--line)]">
                    <div
                      className="h-full rounded-full bg-accent-600 transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              )}

              {!submit.ok && submit.error && (
                <p className="text-sm text-red-600 dark:text-red-400">{submit.error}</p>
              )}
            </div>
          </div>

          {/* Master-detail: every resume on the left, the selected one on the right. */}
          {rows.length > 0 && (
            <div className="grid gap-4 lg:grid-cols-[minmax(15rem,20rem)_1fr]">
              <FileList
                rows={visible}
                total={rows.length}
                selected={activeKey}
                filter={filter}
                onFilter={setFilter}
                onSelect={(key) => {
                  setSelected(key);
                  setView("parsed");
                }}
              />
              <DetailPane result={active} view={view} onView={setView} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** Left rail - every file in the submission, with its live status. */
function FileList({
  rows,
  total,
  selected,
  filter,
  onFilter,
  onSelect,
}: {
  rows: Row[];
  total: number;
  selected: string | null;
  filter: string;
  onFilter: (v: string) => void;
  onSelect: (key: string) => void;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--bg-elev)]/80 backdrop-blur">
      <div className="border-b border-[var(--line)] p-3">
        <input
          value={filter}
          onChange={(e) => onFilter(e.target.value)}
          placeholder={`Filter ${total} file${total > 1 ? "s" : ""}...`}
          className="w-full rounded-lg border border-[var(--line)] bg-[var(--bg)]/60 px-3 py-1.5 text-sm outline-none placeholder:text-[var(--muted)] focus:border-accent-500"
        />
      </div>
      <ul className="scroll-fine max-h-[34rem] divide-y divide-[var(--line)] overflow-auto">
        {rows.length === 0 && (
          <li className="px-3 py-6 text-center text-sm text-[var(--muted)]">No files match.</li>
        )}
        {rows.map((row) => {
          if (row.kind === "skipped") {
            return (
              <li
                key={row.key}
                className="cursor-not-allowed px-3 py-2.5 opacity-70"
                title={row.reason}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm line-through">{row.filename}</span>
                  <JobBadge status="skipped" />
                </div>
                <p className="mt-0.5 truncate text-[11px] text-amber-600 dark:text-amber-400">
                  {row.reason}
                </p>
              </li>
            );
          }

          const { result } = row;
          const job = result.res?.data;
          const jobStatus = !result.res
            ? "parsing"
            : result.res.ok
              ? (job?.status ?? "unknown")
              : "failed";
          const name = job?.data?.personal_info?.full_name;
          const roles = job?.data?.experience?.length ?? 0;
          const isActive = selected === row.key;

          return (
            <li key={row.key}>
              <button
                onClick={() => onSelect(row.key)}
                className={
                  "w-full px-3 py-2.5 text-left transition-colors " +
                  (isActive
                    ? "bg-accent-500/10 border-l-2 border-l-accent-500"
                    : "border-l-2 border-l-transparent hover:bg-[var(--bg)]/60")
                }
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-medium">{row.filename}</span>
                  <JobBadge status={jobStatus} />
                </div>
                <p className="mt-0.5 truncate text-[11px] text-[var(--muted)]">
                  {name ? `${name}${roles ? ` - ${roles} role${roles > 1 ? "s" : ""}` : ""}` : "-"}
                  {job?.partial && (
                    <span className="ml-1 text-amber-600 dark:text-amber-400">- needs review</span>
                  )}
                </p>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** Right pane - the selected resume, as a parsed record or as raw JSON. */
function DetailPane({
  result,
  view,
  onView,
}: {
  result: FileResult | undefined;
  view: "parsed" | "json";
  onView: (v: "parsed" | "json") => void;
}) {
  if (!result) {
    return (
      <div className="flex min-h-[20rem] items-center justify-center rounded-2xl border border-dashed border-[var(--line)] bg-[var(--bg-elev)]/40 p-6">
        <p className="text-sm text-[var(--muted)]">Select a file to see its parsed record.</p>
      </div>
    );
  }

  const res = result.res;
  const job = res?.data;
  const data = job?.data ?? null;
  const error = job?.error ?? res?.error;

  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--bg-elev)]/80 shadow-lg shadow-black/5 backdrop-blur">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--line)] px-4 py-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{result.job.filename}</p>
          <p className="truncate font-mono text-[11px] text-[var(--muted)]">{result.job.job_id}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-[var(--line)] p-0.5">
            <Tab active={view === "parsed"} onClick={() => onView("parsed")}>
              Parsed
            </Tab>
            <Tab active={view === "json"} onClick={() => onView("json")}>
              JSON
            </Tab>
          </div>
          {res?.raw != null && <CopyButton text={JSON.stringify(res.raw, null, 2)} label="Copy JSON" />}
        </div>
      </div>

      <div className="p-4">
        {!res ? (
          <div className="flex min-h-[16rem] items-center justify-center">
            <p className="flex items-center gap-2 text-sm text-[var(--muted)]">
              <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-accent-500" />
              Parsing...
            </p>
          </div>
        ) : view === "json" ? (
          <JsonBlock value={res.raw} max="max-h-[34rem]" />
        ) : data ? (
          <>
            {job?.partial && job.warnings?.length > 0 && (
              <div className="mb-4 rounded-xl border border-amber-300/60 bg-amber-50/70 p-3 text-sm dark:border-amber-900/50 dark:bg-amber-950/30">
                <p className="mb-1 font-medium text-amber-700 dark:text-amber-300">
                  Degraded parse - needs review
                </p>
                <ul className="list-inside list-disc space-y-0.5 text-amber-700/90 dark:text-amber-300/90">
                  {job.warnings.map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              </div>
            )}
            <ResumeResult
              data={data}
              confidence={job?.confidence ?? null}
              skillsValidation={job?.skills_validation ?? null}
            />
          </>
        ) : (
          <p className="text-sm text-red-600 dark:text-red-400">
            {error ?? "No data returned for this file."}
          </p>
        )}
      </div>
    </div>
  );
}

function Tab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={
        "rounded-md px-2.5 py-1 text-xs font-medium transition-colors " +
        (active
          ? "bg-accent-600 text-white"
          : "text-[var(--muted)] hover:text-accent-600 dark:hover:text-accent-400")
      }
    >
      {children}
    </button>
  );
}

const JOB_TONES: Record<string, string> = {
  completed: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
  partial: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
  failed: "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300",
  skipped: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
  parsing: "bg-accent-100 text-accent-700 dark:bg-accent-950/50 dark:text-accent-300",
};

function JobBadge({ status }: { status: string }) {
  const tone = JOB_TONES[status] ?? "bg-[var(--line)] text-[var(--muted)]";
  return (
    <span className={"shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium " + tone}>
      {status}
    </span>
  );
}

function Metric({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "emerald" | "amber" | "teal" | "zinc";
}) {
  const tones = {
    emerald: "text-emerald-600 dark:text-emerald-400",
    amber: "text-amber-600 dark:text-amber-400",
    teal: "text-accent-600 dark:text-accent-400",
    zinc: "text-[var(--fg)]",
  };
  return (
    <div className="rounded-xl border border-[var(--line)] bg-[var(--bg)]/50 px-4 py-3 text-center">
      <p className={"font-display text-2xl font-semibold " + tones[tone]}>{value}</p>
      <p className="mt-0.5 text-[11px] font-medium uppercase tracking-wider text-[var(--muted)]">
        {label}
      </p>
    </div>
  );
}
