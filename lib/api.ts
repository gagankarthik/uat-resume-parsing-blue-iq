// Browser-side API client.
//  - Resume parsing goes through /api/proxy (forwarded to the configured API).
//  - API-key admin goes through /api/keys (server talks to DynamoDB).

import { getSettings } from "@/lib/settings";
import {
  ApiError,
  type ApiErrorBody,
  type ApiKey,
  type CreateApiKeyRequest,
  type CreateApiKeyResponse,
  type JobStatusResponse,
  type ParseResponse,
} from "@/lib/types";

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

// ── Resume parsing (via proxy) ────────────────────────────────────────────────

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
    headers: proxyHeaders(), // do NOT set Content-Type — browser sets the boundary
    body: form,
  });
  return handle<ParseResponse>(res);
}

export async function getJobStatus(jobId: string): Promise<JobStatusResponse> {
  const res = await fetch(proxy(`api/v1/resume/job/${jobId}`), { headers: proxyHeaders() });
  return handle<JobStatusResponse>(res);
}

// ── API-key admin (via server routes) ─────────────────────────────────────────

function adminHeaders(json = false): Record<string, string> {
  const { adminPassword } = getSettings();
  const h: Record<string, string> = {};
  if (adminPassword) h["x-admin-password"] = adminPassword;
  if (json) h["Content-Type"] = "application/json";
  return h;
}

export async function listKeys(): Promise<ApiKey[]> {
  const res = await fetch("/api/keys", { headers: adminHeaders() });
  return handle<ApiKey[]>(res);
}

export async function createKey(payload: CreateApiKeyRequest): Promise<CreateApiKeyResponse> {
  const res = await fetch("/api/keys", {
    method: "POST",
    headers: adminHeaders(true),
    body: JSON.stringify(payload),
  });
  return handle<CreateApiKeyResponse>(res);
}

export async function revokeKey(keyHash: string): Promise<void> {
  const res = await fetch(`/api/keys/${keyHash}`, { method: "PATCH", headers: adminHeaders() });
  await handle(res);
}

export async function deleteKey(keyHash: string): Promise<void> {
  const res = await fetch(`/api/keys/${keyHash}`, { method: "DELETE", headers: adminHeaders() });
  await handle(res);
}
