"use client";

import { useEffect } from "react";

import { Button } from "@/components/ui";
import { health } from "@/lib/api";
import type { HealthResponse } from "@/lib/types";

import { EndpointHeader, ResponseCard, useCall } from "./shared";

export function HealthPanel() {
  const { loading, result, run } = useCall<HealthResponse>();
  const go = () => run(health);

  // Auto-run once on open so the panel isn't empty.
  useEffect(() => {
    go();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const h = result?.data;

  return (
    <div>
      <EndpointHeader method="GET" path="/api/v1/health" title="Health check" blurb="Liveness probe with per-dependency status (DynamoDB, S3) and round-trip latency. No auth required." />

      <Button onClick={go} loading={loading}>
        {loading ? "Checking..." : "Run health check"}
      </Button>

      {h && (
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Status" value={h.status} good={h.status === "ok"} />
          <Stat label="Version" value={h.version} />
          <Stat label="Environment" value={h.environment} />
          <Stat label="Latency" value={h.latency_ms != null ? `${h.latency_ms} ms` : "-"} />
          {h.dependencies &&
            Object.entries(h.dependencies).map(([k, v]) => <Stat key={k} label={k} value={String(v)} good={v === "ok"} />)}
        </div>
      )}

      <ResponseCard result={result} title="GET /health" />
    </div>
  );
}

function Stat({ label, value, good }: { label: string; value: string; good?: boolean }) {
  return (
    <div className="rounded-xl border border-[var(--line)] bg-[var(--bg-elev)]/70 px-4 py-3 backdrop-blur">
      <p className="text-[11px] font-medium uppercase tracking-wider text-[var(--muted)]">{label}</p>
      <p className={"mt-1 flex items-center gap-1.5 font-display text-lg font-semibold capitalize " + (good === undefined ? "text-[var(--fg)]" : good ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400")}>
        {good !== undefined && <span className={"h-2 w-2 rounded-full " + (good ? "bg-emerald-500" : "bg-red-500")} />}
        {value}
      </p>
    </div>
  );
}
