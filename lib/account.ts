"use client";

// Client-side login/logout: sign in with Cognito, exchange the ID token for a
// verified httpOnly session cookie via /api/auth/session.

import { signIn, signOutLocal } from "@/lib/cognito";

export async function login(email: string, password: string): Promise<void> {
  const idToken = await signIn(email, password);
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

export async function logout(): Promise<void> {
  signOutLocal();
  await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
}
