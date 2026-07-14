"use client";

import { useMemo, useState } from "react";

import { Button, Textarea, cn } from "@/components/ui";
import { submitFeedback } from "@/lib/api";
import { type Change, type Issue, diffRecords, findIssues } from "@/lib/review";
import type { ConfidenceScores, ParsedResume } from "@/lib/types";

import { JsonBlock } from "./shared";

// ── Issues ────────────────────────────────────────────────────────────────────

const SEV: Record<Issue["severity"], string> = {
  high: "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300",
  medium: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
  low: "bg-[var(--line)] text-[var(--muted)]",
};

/**
 * What a reviewer should look at, instead of reading 300 lines of JSON.
 *
 * The parser returns null rather than guessing an id it cannot verify, which is
 * correct - but it means the signal is scattered as nulls across a big record. A
 * tester should not have to notice on their own that no city resolved.
 */
export function IssuesList({
  parsed,
  confidence,
  warnings,
}: {
  parsed: ParsedResume | null;
  confidence: ConfidenceScores | null;
  warnings?: string[];
}) {
  const issues = useMemo(
    () => findIssues(parsed, confidence, warnings ?? []),
    [parsed, confidence, warnings],
  );

  if (issues.length === 0) {
    return (
      <div className="rounded-xl border border-emerald-300/60 bg-emerald-50/70 p-4 text-sm text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300">
        Nothing flagged. Every field mapped and every section scored above the review
        threshold.
      </div>
    );
  }

  const counts = {
    high: issues.filter((i) => i.severity === "high").length,
    medium: issues.filter((i) => i.severity === "medium").length,
    low: issues.filter((i) => i.severity === "low").length,
  };

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
        {counts.high > 0 && <span className={"rounded-full px-2 py-0.5 font-medium " + SEV.high}>{counts.high} high</span>}
        {counts.medium > 0 && <span className={"rounded-full px-2 py-0.5 font-medium " + SEV.medium}>{counts.medium} medium</span>}
        {counts.low > 0 && <span className={"rounded-full px-2 py-0.5 font-medium " + SEV.low}>{counts.low} low</span>}
      </div>
      <ul className="space-y-1.5">
        {issues.map((issue, i) => (
          <li
            key={i}
            className="flex items-start gap-3 rounded-lg border border-[var(--line)] bg-[var(--bg)]/50 px-3 py-2"
          >
            <span className={"mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase " + SEV[issue.severity]}>
              {issue.severity}
            </span>
            <div className="min-w-0">
              <p className="truncate font-mono text-[11px] text-[var(--muted)]">{issue.field}</p>
              <p className="text-sm">{issue.detail}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ── Diff ──────────────────────────────────────────────────────────────────────

const KIND_TONE: Record<Change["kind"], string> = {
  added: "text-emerald-600 dark:text-emerald-400",
  removed: "text-red-600 dark:text-red-400",
  changed: "text-amber-600 dark:text-amber-400",
};

function fmt(v: Change["from"]): string {
  if (v === null) return "-";
  return String(v);
}

export function DiffTable({ changes, emptyLabel }: { changes: Change[]; emptyLabel: string }) {
  if (changes.length === 0) {
    return <p className="py-6 text-center text-sm text-[var(--muted)]">{emptyLabel}</p>;
  }
  return (
    <div className="scroll-fine max-h-[30rem] overflow-auto rounded-xl border border-[var(--line)]">
      <div className="min-w-[32rem]">
      <table className="w-full text-left text-sm">
        <thead className="sticky top-0 bg-[var(--bg-elev)] text-[11px] uppercase tracking-wider text-[var(--muted)]">
          <tr>
            <th className="px-3 py-2 font-medium">Field</th>
            <th className="px-3 py-2 font-medium">Before</th>
            <th className="px-3 py-2 font-medium">After</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--line)]">
          {changes.map((c) => (
            <tr key={c.path} className="align-top">
              <td className="px-3 py-1.5 font-mono text-[11px] text-[var(--muted)]">{c.path}</td>
              <td className="px-3 py-1.5 text-red-600/90 dark:text-red-400/90">{fmt(c.from)}</td>
              <td className={"px-3 py-1.5 " + KIND_TONE[c.kind]}>{fmt(c.to)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  );
}

// ── Inline editing + feedback ─────────────────────────────────────────────────

/**
 * Correct the parsed record and send the correction back to the API.
 *
 * This is the whole point of a UAT console: not just looking at output, but telling
 * the parser it was wrong. POST /resume/{job_id}/feedback stores the original and the
 * corrected JSON so the diff can be used to improve extraction.
 *
 * NOTE: submitting here persists candidate PII for 90 days (the feedback table is the
 * ONE place the API retains parsed content). That is stated plainly before the button,
 * not buried - a tester should know what they are opting into.
 */
export function RecordEditor({
  jobId,
  original,
}: {
  jobId: string;
  original: ParsedResume;
}) {
  const [text, setText] = useState(() => JSON.stringify(original, null, 2));
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const parsedEdit = useMemo(() => {
    try {
      return { value: JSON.parse(text) as ParsedResume, error: null as string | null };
    } catch (e) {
      return { value: null, error: e instanceof Error ? e.message : "Invalid JSON" };
    }
  }, [text]);

  const changes = useMemo(
    () => (parsedEdit.value ? diffRecords(original, parsedEdit.value) : []),
    [original, parsedEdit.value],
  );

  async function send() {
    if (!parsedEdit.value || changes.length === 0) return;
    setSending(true);
    setError(null);
    setSent(null);
    const res = await submitFeedback(jobId, {
      original,
      updated: parsedEdit.value,
      notes: `Corrected ${changes.length} field${changes.length > 1 ? "s" : ""} in the UAT console`,
    });
    setSending(false);
    if (res.ok) {
      setSent(`Feedback recorded - ${changes.length} field${changes.length > 1 ? "s" : ""} changed.`);
    } else {
      setError(res.error ?? "Feedback submission failed.");
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <p className="text-sm font-medium">Edit the parsed record</p>
          <button
            onClick={() => setText(JSON.stringify(original, null, 2))}
            className="text-xs text-[var(--muted)] hover:text-accent-600 dark:hover:text-accent-400"
          >
            Reset
          </button>
        </div>
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          spellCheck={false}
          rows={16}
          aria-label="Parsed record JSON"
          className={cn(
            "scroll-fine h-72 font-mono text-xs",
            parsedEdit.error && "border-red-400 focus:border-red-500 focus:ring-red-500/10",
          )}
        />
        {parsedEdit.error && (
          <p className="mt-1 text-xs text-red-600 dark:text-red-400">{parsedEdit.error}</p>
        )}
      </div>

      <div>
        <p className="mb-1.5 text-sm font-medium">
          Your corrections{changes.length > 0 && ` (${changes.length})`}
        </p>
        <DiffTable changes={changes} emptyLabel="No changes yet - edit a field above." />
      </div>

      <div className="rounded-xl border border-amber-300/60 bg-amber-50/70 p-3 text-xs text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300">
        Submitting stores the original and corrected JSON - including candidate PII - for
        90 days. This is the only endpoint on which the API retains parsed content.
      </div>

      <div className="flex items-center gap-3">
        <Button onClick={send} loading={sending} disabled={!parsedEdit.value || changes.length === 0}>
          {sending ? "Sending..." : "Submit correction"}
        </Button>
        {sent && <span className="text-sm text-emerald-600 dark:text-emerald-400">{sent}</span>}
        {error && <span className="text-sm text-red-600 dark:text-red-400">{error}</span>}
      </div>
    </div>
  );
}

// ── Compare two records ───────────────────────────────────────────────────────

export function CompareView({
  left,
  right,
}: {
  left: { label: string; data: ParsedResume | null } | null;
  right: { label: string; data: ParsedResume | null } | null;
}) {
  const changes = useMemo(
    () => (left?.data && right?.data ? diffRecords(left.data, right.data) : []),
    [left, right],
  );

  if (!left?.data || !right?.data) {
    return (
      <p className="py-10 text-center text-sm text-[var(--muted)]">
        Pick two parsed files to compare them field by field.
      </p>
    );
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2 text-sm">
        <span className="rounded-lg bg-red-100 px-2 py-0.5 font-medium text-red-700 dark:bg-red-950/50 dark:text-red-300">
          {left.label}
        </span>
        <span className="text-[var(--muted)]">vs</span>
        <span className="rounded-lg bg-emerald-100 px-2 py-0.5 font-medium text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
          {right.label}
        </span>
        <span className="ml-auto font-mono text-xs text-[var(--muted)]">
          {changes.length} difference{changes.length === 1 ? "" : "s"}
        </span>
      </div>
      <DiffTable changes={changes} emptyLabel="These two records are identical." />
    </div>
  );
}

export { JsonBlock };
