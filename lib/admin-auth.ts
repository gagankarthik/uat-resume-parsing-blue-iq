// Lightweight gate for the API-key admin routes.
//
// If ADMIN_PASSWORD is set in the server environment, requests to the admin
// routes must send a matching `x-admin-password` header. If it is unset (local
// UAT convenience) the routes are open — set it before exposing this tool.

import "server-only";

import type { NextRequest } from "next/server";

export function checkAdmin(req: NextRequest): { ok: true } | { ok: false; status: number; detail: string } {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return { ok: true }; // not configured → open (local only)
  const provided = req.headers.get("x-admin-password") ?? "";
  if (provided !== expected) {
    return { ok: false, status: 401, detail: "Invalid or missing admin password" };
  }
  return { ok: true };
}
