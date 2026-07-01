import { redirect } from "next/navigation";

import { isCurrentUserAdmin } from "@/lib/admin";
import { PARSER_TABLES } from "@/lib/dynamo";
import { getSessionClaims } from "@/lib/session";

import { AdminData } from "./AdminData";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const claims = await getSessionClaims();
  if (!claims) redirect("/login");
  if (!(await isCurrentUserAdmin())) redirect("/");

  const tables = PARSER_TABLES.map((t) => ({ id: t.id, label: t.label, name: t.name }));
  return <AdminData tables={tables} email={claims.email} />;
}
