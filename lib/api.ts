// Browser-side API client. Calls go through the same-origin /api/proxy route,
// which forwards to the resume-parser API. The target base URL and API key live
// only on the server (NEXT_PUBLIC_API_BASE_URL + RESUME_PARSER_API_KEY), so the
// browser never sees or sends them.
//
// Every call returns a CallResult carrying the HTTP status and round-trip latency
// so the console can render a real request/response panel — it never throws for a
// non-2xx response (that's expected, testable output), only surfaces it.

import {
  type BatchStatusResponse,
  type BatchSubmitResponse,
  type FeedbackResponse,
  type HealthResponse,
  type JobStatusResponse,
  type ParseResponse,
  type ParsedResume,
  type RetryResponse,
  type UploadUrlResponse,
  type WebhookResponse,
} from "@/lib/types";

export interface CallResult<T> {
  ok: boolean;
  status: number; // HTTP status; 0 on a network/transport error
  ms: number; // round-trip latency in milliseconds
  data: T | null; // parsed body when ok
  error: string | null; // human message when !ok
  raw: unknown; // parsed body regardless of ok (for the raw viewer)
}

const proxy = (path: string) => `/api/proxy/${path.replace(/^\/+/, "")}`;

function messageFrom(body: unknown, status: number): string {
  if (body && typeof body === "object") {
    const err = (body as { error?: { detail?: string } }).error;
    if (err?.detail) return err.detail;
    const detail = (body as { detail?: string }).detail;
    if (typeof detail === "string") return detail;
  }
  if (typeof body === "string" && body) return body;
  return `Request failed (HTTP ${status})`;
}

async function call<T>(path: string, init?: RequestInit): Promise<CallResult<T>> {
  const t0 = performance.now();
  let res: Response;
  try {
    res = await fetch(proxy(path), init);
  } catch (e) {
    return {
      ok: false,
      status: 0,
      ms: Math.round(performance.now() - t0),
      data: null,
      error: e instanceof Error ? e.message : "Network error",
      raw: null,
    };
  }
  const ms = Math.round(performance.now() - t0);
  const text = await res.text();
  let body: unknown = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }
  return {
    ok: res.ok,
    status: res.status,
    ms,
    data: res.ok ? (body as T) : null,
    error: res.ok ? null : messageFrom(body, res.status),
    raw: body,
  };
}

const json = (payload: unknown): RequestInit => ({
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(payload),
});

function fileForm(field: string, files: File | File[]): FormData {
  const form = new FormData();
  const list = Array.isArray(files) ? files : [files];
  for (const f of list) form.append(field, f);
  return form;
}

// The parse API is now UNIFORMLY ASYNCHRONOUS: every submit endpoint returns
// immediately with `{ job_id, status: "processing", poll_url }` and never blocks on
// the parse, so a complete parse no longer has to fit inside the proxy's request
// window. The console submits, then polls `GET /resume/job/{job_id}` to completion
// (see `getJobStatus` + the panels). The old `async_only` flag is deprecated and
// ignored upstream, so it is no longer sent. Callers stay backward-tolerant: if a
// submit ever comes back already `completed` with inline `data`, use it directly
// and skip polling.

// ── Health ────────────────────────────────────────────────────────────────────
export const health = () => call<HealthResponse>("api/v1/health");

// ── Parse (single) ────────────────────────────────────────────────────────────
export const parseResume = (file: File) =>
  call<ParseResponse>("api/v1/resume/parse", { method: "POST", body: fileForm("file", file) });

export const getJobStatus = (jobId: string) =>
  call<JobStatusResponse>(`api/v1/resume/job/${encodeURIComponent(jobId)}`);

export const retryParse = (jobId: string, file: File) =>
  call<RetryResponse>(`api/v1/resume/${encodeURIComponent(jobId)}/retry`, {
    method: "POST",
    body: fileForm("file", file),
  });

// ── Batch ─────────────────────────────────────────────────────────────────────
export const batchParse = (files: File[]) =>
  call<BatchSubmitResponse>("api/v1/resume/batch", { method: "POST", body: fileForm("files", files) });

export const getBatchStatus = (batchId: string) =>
  call<BatchStatusResponse>(`api/v1/resume/batch/${encodeURIComponent(batchId)}`);

// ── Feedback ──────────────────────────────────────────────────────────────────
export const submitFeedback = (
  jobId: string,
  payload: { original: ParsedResume; updated: ParsedResume; changed?: boolean; notes?: string; profile_id?: string },
) => call<FeedbackResponse>(`api/v1/resume/${encodeURIComponent(jobId)}/feedback`, json(payload));

// ── Webhooks ──────────────────────────────────────────────────────────────────
export const listWebhooks = () => call<WebhookResponse[]>("api/v1/webhooks");
export const createWebhook = (url: string, events: string[]) =>
  call<WebhookResponse>("api/v1/webhooks", json({ url, events }));
export const deleteWebhook = (webhookId: string) =>
  call<{ webhook_id?: string; status?: string }>(`api/v1/webhooks/${encodeURIComponent(webhookId)}`, {
    method: "DELETE",
  });

// ── Large files (presigned direct-to-S3) ──────────────────────────────────────
export const createUploadUrl = (filename: string) =>
  call<UploadUrlResponse>("api/v1/resume/upload-url", json({ filename }));

export const parseUploaded = (jobId: string) =>
  call<ParseResponse>("api/v1/resume/parse-uploaded", json({ job_id: jobId }));

// Direct multipart POST to the presigned S3 URL (bypasses the proxy — goes
// straight to S3). Returns the raw HTTP status; S3 replies 204/201 on success.
export async function uploadToS3(
  uploadUrl: string,
  fields: Record<string, string>,
  file: File,
): Promise<{ ok: boolean; status: number; ms: number; error: string | null }> {
  const form = new FormData();
  for (const [k, v] of Object.entries(fields)) form.append(k, v);
  form.append("file", file);
  const t0 = performance.now();
  try {
    const res = await fetch(uploadUrl, { method: "POST", body: form });
    return { ok: res.ok, status: res.status, ms: Math.round(performance.now() - t0), error: res.ok ? null : `S3 responded ${res.status}` };
  } catch (e) {
    return {
      ok: false,
      status: 0,
      ms: Math.round(performance.now() - t0),
      error: e instanceof Error ? e.message : "S3 upload failed (likely CORS on the bucket)",
    };
  }
}
