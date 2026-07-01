"use client";

// Shared building blocks for the API console: status pills, the request/response
// card, a reusable dropzone, JSON viewer, and a small call-runner hook.

import { useCallback, useRef, useState, type ReactNode } from "react";

import { cn } from "@/components/ui";
import type { CallResult } from "@/lib/api";

// ── HTTP method chip ──────────────────────────────────────────────────────────
const METHOD_TONE: Record<string, string> = {
  GET: "text-sky-600 dark:text-sky-400",
  POST: "text-accent-600 dark:text-accent-400",
  DELETE: "text-red-600 dark:text-red-400",
  PATCH: "text-amber-600 dark:text-amber-400",
};

export function Method({ m }: { m: string }) {
  return <span className={cn("font-mono text-[11px] font-bold tracking-wide", METHOD_TONE[m] ?? "text-[var(--muted)]")}>{m}</span>;
}

// ── Status pill (colored by class) + latency ──────────────────────────────────
export function StatusPill({ status, ms }: { status: number; ms?: number }) {
  const cls =
    status === 0
      ? "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300"
      : status < 300
        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
        : status < 400
          ? "bg-sky-100 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300"
          : status < 500
            ? "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300"
            : "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300";
  return (
    <span className="inline-flex items-center gap-2">
      <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 font-mono text-xs font-semibold", cls)}>
        <span className="h-1.5 w-1.5 rounded-full bg-current" />
        {status === 0 ? "NETWORK" : status}
      </span>
      {ms != null && <span className="font-mono text-xs text-[var(--muted)]">{ms} ms</span>}
    </span>
  );
}

// ── Copy button ───────────────────────────────────────────────────────────────
export function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1400);
      }}
      className="rounded-md border border-[var(--line)] bg-[var(--bg-elev)] px-2.5 py-1 font-mono text-[11px] font-medium text-[var(--muted)] transition-colors hover:border-accent-400 hover:text-accent-600 active:scale-95 dark:hover:text-accent-400"
    >
      {copied ? "Copied ✓" : label}
    </button>
  );
}

// ── JSON viewer ───────────────────────────────────────────────────────────────
export function JsonBlock({ value, max = "max-h-[26rem]" }: { value: unknown; max?: string }) {
  const text = typeof value === "string" ? value : JSON.stringify(value, null, 2);
  return (
    <pre className={cn("scroll-fine overflow-auto rounded-xl border border-[var(--line)] bg-[var(--bg)]/70 p-4 font-mono text-[12.5px] leading-relaxed text-[var(--fg)]", max)}>
      {text}
    </pre>
  );
}

// ── Response card — wraps any CallResult ──────────────────────────────────────
export function ResponseCard({
  result,
  title = "Response",
  children,
}: {
  result: CallResult<unknown> | null;
  title?: string;
  children?: ReactNode; // optional structured view rendered above the raw JSON
}) {
  if (!result) return null;
  const raw = result.raw ?? { note: "empty body" };
  const jsonText = typeof raw === "string" ? raw : JSON.stringify(raw, null, 2);
  return (
    <div className="pop-in mt-5 overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--bg-elev)]/80 shadow-lg shadow-black/5 backdrop-blur">
      <div className="flex items-center justify-between gap-3 border-b border-[var(--line)] px-4 py-3">
        <div className="flex items-center gap-3">
          <StatusPill status={result.status} ms={result.ms} />
          <span className="text-sm font-medium text-[var(--fg)]">{title}</span>
        </div>
        <CopyButton text={jsonText} label="Copy JSON" />
      </div>
      <div className="p-4">
        {!result.ok && result.error && (
          <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-red-300/70 bg-red-50/80 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
            <svg className="mt-0.5 h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none">
              <path d="M12 9v4m0 4h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {result.error}
          </div>
        )}
        {children}
        <JsonBlock value={raw} />
      </div>
    </div>
  );
}

// ── Reusable dropzone ─────────────────────────────────────────────────────────
export function Dropzone({
  accept,
  multiple = false,
  onFiles,
  hint,
  compact = false,
}: {
  accept: string;
  multiple?: boolean;
  onFiles: (files: File[]) => void;
  hint?: string;
  compact?: boolean;
}) {
  const [drag, setDrag] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const emit = (list: FileList | null) => {
    if (!list || list.length === 0) return;
    onFiles(Array.from(list));
  };
  return (
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
        emit(e.dataTransfer.files);
      }}
      className={cn(
        "group relative flex cursor-pointer flex-col items-center justify-center overflow-visible rounded-2xl border bg-[var(--bg-elev)]/70 text-center backdrop-blur-md transition-all duration-300",
        compact ? "px-5 py-8" : "px-6 py-14",
        drag ? "ring-glow scale-[1.01] border-transparent" : "border-[var(--line)] hover:-translate-y-0.5 hover:shadow-xl hover:shadow-accent-500/10",
      )}
    >
      <div
        className={cn(
          "grid place-items-center rounded-2xl transition-all duration-300",
          compact ? "h-11 w-11" : "h-14 w-14",
          drag ? "scale-110 bg-accent-600 text-white shadow-lg shadow-accent-500/30" : "bg-accent-50 text-accent-600 group-hover:scale-105 dark:bg-accent-950/50 dark:text-accent-400",
        )}
      >
        <svg width={compact ? 20 : 26} height={compact ? 20 : 26} viewBox="0 0 24 24" fill="none" className={drag ? "" : "animate-float"}>
          <path d="M12 16V4m0 0L7 9m5-5 5 5M5 19h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <p className={cn("font-display font-medium tracking-tight", compact ? "mt-3 text-base" : "mt-4 text-lg")}>
        {drag ? "Release to upload" : multiple ? "Drop files here" : "Drop a file here"}
      </p>
      <p className="mt-1 text-sm text-[var(--muted)]">
        or <span className="font-medium text-accent-600 group-hover:underline dark:text-accent-400">browse</span>
        {hint ? ` · ${hint}` : ""}
      </p>
      <input ref={inputRef} type="file" accept={accept} multiple={multiple} className="hidden" onChange={(e) => emit(e.target.files)} />
    </div>
  );
}

// ── Endpoint header shown at the top of every panel ───────────────────────────
export function EndpointHeader({ method, path, title, blurb }: { method: string; path: string; title: string; blurb: string }) {
  return (
    <div className="mb-6">
      <div className="flex items-center gap-2.5">
        <span className="rounded-md border border-[var(--line)] bg-[var(--bg-elev)] px-2 py-0.5">
          <Method m={method} />
        </span>
        <code className="font-mono text-[13px] text-[var(--muted)]">{path}</code>
      </div>
      <h2 className="mt-3 font-display text-2xl font-semibold tracking-tight text-[var(--fg)]">{title}</h2>
      <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-[var(--muted)]">{blurb}</p>
    </div>
  );
}

// ── Tiny hook: run a CallResult-returning fn with loading state ────────────────
export function useCall<T>() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CallResult<T> | null>(null);
  const run = useCallback(async (fn: () => Promise<CallResult<T>>) => {
    setLoading(true);
    try {
      const r = await fn();
      setResult(r);
      return r;
    } finally {
      setLoading(false);
    }
  }, []);
  const reset = useCallback(() => setResult(null), []);
  return { loading, result, run, reset, setResult };
}

export function humanSize(b: number): string {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / (1024 * 1024)).toFixed(2)} MB`;
}
