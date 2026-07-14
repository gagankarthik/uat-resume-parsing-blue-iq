/**
 * Batch run history, persisted in localStorage.
 *
 * The console used to lose everything on refresh: a 50-file batch that took two
 * minutes to parse was gone the moment you hit reload, and the async job results
 * TTL out of DynamoDB after an hour, so there was no way to get them back. Keeping
 * the finished records locally means a tester can close the tab, come back, and
 * still compare this run against the last one.
 *
 * Deliberately NOT server-side: these records contain candidate PII, and the API's
 * whole privacy posture is that it does not retain parsed content (the one exception
 * being the feedback endpoint, which the user opts into explicitly). Persisting to
 * the tester's own browser keeps that promise intact.
 */

import type { ConfidenceScores, ParsedResume } from "./types";

const KEY = "uat.batch.history.v1";
const MAX_RUNS = 20;

export type HistoryFile = {
  job_id: string;
  filename: string;
  status: string;
  partial?: boolean;
  warnings?: string[];
  data: ParsedResume | null;
  confidence: ConfidenceScores | null;
  raw?: unknown;
};

export type HistoryRun = {
  batch_id: string;
  at: number; // epoch ms
  total: number;
  skipped: number;
  files: HistoryFile[];
};

function read(): HistoryRun[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as HistoryRun[]) : [];
  } catch {
    return []; // corrupt or unavailable storage must never break the console
  }
}

export function listRuns(): HistoryRun[] {
  return read().sort((a, b) => b.at - a.at);
}

// ── useSyncExternalStore plumbing ─────────────────────────────────────────────
//
// localStorage is an EXTERNAL store, so React 19 wants useSyncExternalStore rather
// than "read it in an effect and setState" (which the compiler rejects outright as a
// cascading render). Two constraints that make this fiddly:
//
//   * getSnapshot must be REFERENTIALLY STABLE between changes. Returning a fresh
//     array each call makes React re-render forever, so the snapshot is cached and
//     only recomputed when we actually write.
//   * The server has no localStorage, so getServerSnapshot returns a frozen empty
//     array - the same reference every time, or hydration loops.

const EMPTY: HistoryRun[] = [];
let snapshot: HistoryRun[] | null = null;
const listeners = new Set<() => void>();

function invalidate(): void {
  snapshot = null;
  for (const l of listeners) l();
}

export function subscribeRuns(cb: () => void): () => void {
  listeners.add(cb);
  // Another tab writing history should update this one too.
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) invalidate();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", onStorage);
  };
}

export function getRunsSnapshot(): HistoryRun[] {
  if (snapshot === null) snapshot = listRuns();
  return snapshot;
}

export function getRunsServerSnapshot(): HistoryRun[] {
  return EMPTY;
}

export function saveRun(run: HistoryRun): void {
  if (typeof window === "undefined") return;
  try {
    const runs = read().filter((r) => r.batch_id !== run.batch_id);
    runs.unshift(run);
    window.localStorage.setItem(KEY, JSON.stringify(runs.slice(0, MAX_RUNS)));
    invalidate();
  } catch {
    // Quota exceeded on a big batch: drop the oldest runs and try once more, then
    // give up quietly. Losing history is not worth breaking the page over.
    try {
      window.localStorage.setItem(KEY, JSON.stringify([run]));
      invalidate();
    } catch {
      /* ignore */
    }
  }
}

export function deleteRun(batchId: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(read().filter((r) => r.batch_id !== batchId)));
    invalidate();
  } catch {
    /* ignore */
  }
}

export function clearRuns(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(KEY);
    invalidate();
  } catch {
    /* ignore */
  }
}
