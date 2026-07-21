"use client";

// Client-side login/logout: sign in with Cognito, exchange the ID token for a
// verified httpOnly session cookie via /api/auth/session.

import { signIn, signOutLocal } from "@/lib/cognito";

async function establishSession(idToken: string): Promise<void> {
  const res = await fetch("/api/auth/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error?.detail || "Could not establish a session");
  }
}

/**
 * Result of a login attempt.
 *  - "SUCCESS": the session cookie is set; the caller can navigate on.
 *  - "NEW_PASSWORD_REQUIRED": the account was invited with a temporary password.
 *    Call `setNewPassword` with the chosen password to finish signing in.
 */
export type LoginResult =
  | { status: "SUCCESS" }
  | { status: "NEW_PASSWORD_REQUIRED"; setNewPassword: (newPassword: string) => Promise<void> };

export async function login(email: string, password: string): Promise<LoginResult> {
  const result = await signIn(email, password);
  if (result.status === "SUCCESS") {
    await establishSession(result.idToken);
    return { status: "SUCCESS" };
  }
  return {
    status: "NEW_PASSWORD_REQUIRED",
    setNewPassword: async (newPassword: string) => {
      const idToken = await result.completeNewPassword(newPassword);
      await establishSession(idToken);
    },
  };
}

export async function logout(): Promise<void> {
  signOutLocal();
  await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
}
