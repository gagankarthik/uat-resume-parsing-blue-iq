// Admin gating by email allow-list (ADMIN_EMAILS, comma-separated, server-only).
// The admin area exposes raw DynamoDB contents, so it is restricted to operators.

import { getSessionClaims } from "@/lib/session";

function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return adminEmails().includes(email.toLowerCase());
}

/** True if the current verified session belongs to an admin. Server-only. */
export async function isCurrentUserAdmin(): Promise<boolean> {
  const claims = await getSessionClaims();
  return isAdminEmail(claims?.email);
}
