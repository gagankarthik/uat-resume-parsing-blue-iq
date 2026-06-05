// Browser-side API client. Calls go through the same-origin /api/proxy route,
// which forwards to the resume-parser API. The target base URL and API key live
// only on the server (NEXT_PUBLIC_API_BASE_URL + RESUME_PARSER_API_KEY), so the
// browser never sees or sends them.

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

const proxy = (path: string) => `/api/proxy/${path.replace(/^\/+/, "")}`;

export async function parseResume(file: File): Promise<ParseResponse> {
  const form = new FormData();
  form.append("file", file);
  // No Content-Type header — the browser sets the multipart boundary itself.
  const res = await fetch(proxy("api/v1/resume/parse"), { method: "POST", body: form });
  return handle<ParseResponse>(res);
}

export async function getJobStatus(jobId: string): Promise<JobStatusResponse> {
  const res = await fetch(proxy(`api/v1/resume/job/${jobId}`));
  return handle<JobStatusResponse>(res);
}
