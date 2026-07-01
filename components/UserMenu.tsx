"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { logout } from "@/lib/account";

export function UserMenu({ email, admin }: { email: string; admin: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function signOut() {
    setBusy(true);
    await logout();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="flex items-center gap-2 sm:gap-3">
      {admin && (
        <Link
          href="/admin"
          className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1.5 text-sm font-medium text-ink transition-colors hover:border-accent-300 hover:bg-accent-50 hover:text-accent-700"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none"><path d="M4 7h16M4 12h16M4 17h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
          Admin
        </Link>
      )}
      <span className="hidden max-w-[16ch] truncate text-sm text-ink-soft sm:inline" title={email}>{email}</span>
      <button
        onClick={signOut}
        disabled={busy}
        className="inline-flex items-center rounded-full px-3 py-1.5 text-sm font-medium text-ink-soft transition-colors hover:bg-black/[0.04] hover:text-ink disabled:opacity-50"
      >
        {busy ? "Signing out…" : "Sign out"}
      </button>
    </div>
  );
}
