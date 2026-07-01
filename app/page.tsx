import { Console } from "@/components/Console";

export default function Home() {
  return (
    <div className="w-full">
      {/* Hero */}
      <div className="mb-8 max-w-2xl">
        <span className="reveal inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-[var(--bg-elev)]/60 px-3 py-1 text-xs font-medium text-[var(--muted)] backdrop-blur" style={{ animationDelay: "0ms" }}>
          <span className="h-1.5 w-1.5 rounded-full bg-accent-500" />
          Live API · api.parsinglab.blue-iq.ai
        </span>
        <h1 className="reveal mt-4 font-display text-4xl font-semibold leading-[1.05] tracking-tight sm:text-5xl" style={{ animationDelay: "80ms" }}>
          Résumé Parser <span className="text-accent-700">API console</span>
        </h1>
        <p className="reveal mt-3 text-[15px] leading-relaxed text-[var(--muted)]" style={{ animationDelay: "160ms" }}>
          Exercise every endpoint the client integration uses — parse, batch, jobs, feedback, webhooks, and health — with live
          requests, real response codes, and latency. The API key stays on the server.
        </p>
      </div>

      <Console />
    </div>
  );
}
