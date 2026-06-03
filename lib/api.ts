// Browser-side API client. Calls go through the same-origin /api/proxy route,
// which forwards to the configured API with your X-API-Key header (no AWS — just
// the API key, exactly like a real consumer).

import { getSettings } from "@/lib/settings";
import { ApiError, type ApiErrorBody, type JobStatusResponse, type ParseResponse } from "@/lib/types";

async function handle<T>(res: Response): Promise<T> {
  const text = await res.text();
  let parsed: unknown = null;
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = text;
    }
  }
  if (!res.ok) {
    const body = parsed as ApiErrorBody | string | null;
    let message = `Request failed (HTTP ${res.status})`;
    if (body && typeof body === "object" && "error" in body && body.error?.detail) {
      message = body.error.detail;
    } else if (typeof body === "string" && body) {
      message = body;
    }
    throw new ApiError(res.status, message, body);
  }
  return parsed as T;
}

function proxyHeaders(): Record<string, string> {
  const { apiBaseUrl, apiKey } = getSettings();
  return { "x-target-base-url": apiBaseUrl, "x-api-key": apiKey };
}
const proxy = (path: string) => `/api/proxy/${path.replace(/^\/+/, "")}`;

export async function parseResume(file: File): Promise<ParseResponse> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(proxy("api/v1/resume/parse"), {
    method: "POST",
    headers: proxyHeaders(), // do NOT set Content-Type — browser sets the multipart boundary
    body: form,
  });
  return handle<ParseResponse>(res);
}

export async function getJobStatus(jobId: string): Promise<JobStatusResponse> {
  const res = await fetch(proxy(`api/v1/resume/job/${jobId}`), { headers: proxyHeaders() });
  return handle<JobStatusResponse>(res);
}
