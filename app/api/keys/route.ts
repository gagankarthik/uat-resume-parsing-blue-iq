// API-key admin: list (GET) and create (POST).
import { NextRequest } from "next/server";

import { checkAdmin } from "@/lib/admin-auth";
import { createApiKey, listApiKeys } from "@/lib/aws-keys";

export const dynamic = "force-dynamic";

function fail(status: number, detail: string): Response {
  return Response.json({ error: { detail } }, { status });
}

export async function GET(req: NextRequest) {
  const gate = checkAdmin(req);
  if (!gate.ok) return fail(gate.status, gate.detail);
  try {
    return Response.json(await listApiKeys());
  } catch (err) {
    return fail(500, err instanceof Error ? err.message : "Failed to list API keys");
  }
}

export async function POST(req: NextRequest) {
  const gate = checkAdmin(req);
  if (!gate.ok) return fail(gate.status, gate.detail);

  let body: { company_id?: string; rate_limit_per_minute?: number; rate_limit_per_day?: number };
  try {
    body = await req.json();
  } catch {
    return fail(400, "Invalid JSON body");
  }

  const companyId = (body.company_id ?? "").trim();
  if (!companyId) return fail(422, "company_id is required");

  const rpm = Number(body.rate_limit_per_minute ?? 30);
  const rpd = Number(body.rate_limit_per_day ?? 1000);
  if (!Number.isFinite(rpm) || rpm <= 0 || !Number.isFinite(rpd) || rpd <= 0) {
    return fail(422, "Rate limits must be positive numbers");
  }

  try {
    const created = await createApiKey(companyId, rpm, rpd);
    return Response.json(created, { status: 201 });
  } catch (err) {
    return fail(500, err instanceof Error ? err.message : "Failed to create API key");
  }
}
