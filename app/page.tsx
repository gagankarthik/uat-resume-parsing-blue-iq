import Link from "next/link";
import { redirect } from "next/navigation";

import { Console } from "@/components/Console";
import { isAdminEmail } from "@/lib/admin";
import { getSessionClaims } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function Home() {
  const claims = await getSessionClaims();
  if (!claims) redirect("/login");
  const admin = isAdminEmail(claims.email);

  return (
    <div className="w-full">
      {/* Hero */}
      <div className="mb-8 max-w-2xl">
        <span className="reveal inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1 text-xs font-medium text-ink-soft" style={{ animationDelay: "0ms" }}>
          <span className="h-1.5 w-1.5 rounded-full bg-accent-500" />
          Live API - api.parsinglab.blue-iq.ai
        </span>
        <h1 className="reveal mt-4 font-display text-4xl font-semibold leading-[1.05] tracking-tight sm:text-5xl" style={{ animationDelay: "80ms" }}>
          Resume Parser <span className="text-accent-700">API console</span>
        </h1>
        <p className="reveal mt-3 text-[15px] leading-relaxed text-ink-soft" style={{ animationDelay: "160ms" }}>
          Exercise every endpoint the client integration uses - parse, batch, jobs, feedback, webhooks, and health - with live
          requests, real response codes, and latency. The API key stays on the server.
        </p>
        {admin && (
          <Link href="/admin" className="reveal mt-4 inline-flex items-center gap-1.5 rounded-full bg-accent-700 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:-translate-y-px hover:bg-accent-800" style={{ animationDelay: "220ms" }}>
            Open admin data viewer
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none"><path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </Link>
        )}
      </div>

      <Console />
    </div>
  );
}
