// API-key admin for a single key:
//   PATCH  → revoke (sets status = "revoked"; key stops working but is retained)
//   DELETE → permanently remove the record
import { NextRequest } from "next/server";

import { checkAdmin } from "@/lib/admin-auth";
import { deleteApiKey, revokeApiKey } from "@/lib/aws-keys";

export const dynamic = "force-dynamic";

function fail(status: number, detail: string): Response {
  return Response.json({ error: { detail } }, { status });
}

type Ctx = { params: Promise<{ hash: string }> };

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const gate = checkAdmin(req);
  if (!gate.ok) return fail(gate.status, gate.detail);
  const { hash } = await ctx.params;
  try {
    await revokeApiKey(hash);
    return Response.json({ ok: true, key_hash: hash, status: "revoked" });
  } catch (err) {
    return fail(500, err instanceof Error ? err.message : "Failed to revoke key");
  }
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  const gate = checkAdmin(req);
  if (!gate.ok) return fail(gate.status, gate.detail);
  const { hash } = await ctx.params;
  try {
    await deleteApiKey(hash);
    return Response.json({ ok: true, key_hash: hash, deleted: true });
  } catch (err) {
    return fail(500, err instanceof Error ? err.message : "Failed to delete key");
  }
}
