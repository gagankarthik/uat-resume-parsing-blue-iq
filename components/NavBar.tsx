import Link from "next/link";

import { Logo } from "@/components/ui";
import { UserMenu } from "@/components/UserMenu";
import { isAdminEmail } from "@/lib/admin";
import { getSessionClaims } from "@/lib/session";

export async function NavBar() {
  const claims = await getSessionClaims();

  return (
    <header className="sticky top-0 z-50 border-b border-line/70 bg-paper/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-3">
          <Logo className="h-7 w-auto sm:h-8" />
        </Link>

        {claims ? (
          <UserMenu email={claims.email} admin={isAdminEmail(claims.email)} />
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-ink-soft">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent-500 opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-accent-500" />
            </span>
            UAT Console
          </span>
        )}
      </div>
    </header>
  );
}
