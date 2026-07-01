// Admin-only: scan a resume-parser DynamoDB table and return its contents.
// Gated by the ADMIN_EMAILS allow-list on the verified session.
import { NextRequest } from "next/server";

import { isCurrentUserAdmin } from "@/lib/admin";
import { scanTable, tableById } from "@/lib/dynamo";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!(await isCurrentUserAdmin())) {
    return Response.json({ error: { detail: "Admin access required" } }, { status: 403 });
  }
  const id = req.nextUrl.searchParams.get("table") || "";
  const ref = tableById(id);
  if (!ref) {
    return Response.json({ error: { detail: `Unknown table '${id}'` } }, { status: 400 });
  }
  try {
    const data = await scanTable(ref.name);
    return Response.json({ table: ref.id, name: ref.name, ...data });
  } catch (e) {
    return Response.json(
      { error: { detail: e instanceof Error ? e.message : "Scan failed" } },
      { status: 500 },
    );
  }
}
