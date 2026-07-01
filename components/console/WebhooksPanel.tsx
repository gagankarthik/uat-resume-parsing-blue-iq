"use client";

import { useEffect, useState } from "react";

import { Button, Input, Label, cn } from "@/components/ui";
import { createWebhook, deleteWebhook, listWebhooks } from "@/lib/api";
import { WEBHOOK_EVENTS, type WebhookResponse } from "@/lib/types";

import { CopyButton, EndpointHeader, JsonBlock, StatusPill, useCall } from "./shared";

export function WebhooksPanel() {
  const list = useCall<WebhookResponse[]>();
  const create = useCall<WebhookResponse>();
  const [url, setUrl] = useState("");
  const [events, setEvents] = useState<string[]>(["parse.completed"]);
  const [deleting, setDeleting] = useState<string | null>(null);

  const refresh = () => list.run(listWebhooks);
  useEffect(() => { refresh(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  function toggle(ev: string) {
    setEvents((cur) => (cur.includes(ev) ? cur.filter((e) => e !== ev) : [...cur, ev]));
  }

  async function add() {
    const r = await create.run(() => createWebhook(url.trim(), events));
    if (r.ok) {
      setUrl("");
      refresh();
    }
  }

  async function remove(id: string) {
    setDeleting(id);
    await deleteWebhook(id);
    setDeleting(null);
    refresh();
  }

  const created = create.result?.data;
  const hooks = list.result?.data ?? [];

  return (
    <div>
      <EndpointHeader method="POST" path="/api/v1/webhooks" title="Webhooks" blurb="Register delivery URLs to receive parse.completed, parse.failed, and batch.completed events. Creating a webhook returns a one-time HMAC secret used to verify payload signatures." />

      {/* Create */}
      <div className="rounded-2xl border border-[var(--line)] bg-[var(--bg-elev)]/70 p-4 backdrop-blur">
        <Label>Delivery URL</Label>
        <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://example.com/hooks/resume" className="mb-4" />
        <Label>Events</Label>
        <div className="mb-4 flex flex-wrap gap-2">
          {WEBHOOK_EVENTS.map((ev) => {
            const on = events.includes(ev);
            return (
              <button
                key={ev}
                onClick={() => toggle(ev)}
                className={cn(
                  "rounded-lg border px-3 py-1.5 font-mono text-xs font-medium transition-all",
                  on ? "border-teal-500 bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300" : "border-[var(--line)] text-[var(--muted)] hover:border-teal-400",
                )}
              >
                {on ? "✓ " : ""}{ev}
              </button>
            );
          })}
        </div>
        <Button onClick={add} loading={create.loading} disabled={!url.trim() || events.length === 0}>Register webhook</Button>

        {created?.hmac_secret && (
          <div className="pop-in mt-4 rounded-xl border border-amber-300/60 bg-amber-50/70 p-3 dark:border-amber-900/50 dark:bg-amber-950/30">
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-300">HMAC secret — shown once, store it now</p>
            <div className="flex items-center gap-2">
              <code className="scroll-fine flex-1 overflow-auto rounded-md bg-white/70 px-2 py-1 font-mono text-xs text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">{created.hmac_secret}</code>
              <CopyButton text={created.hmac_secret} />
            </div>
          </div>
        )}
        {create.result && !create.result.ok && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{create.result.error}</p>}
      </div>

      {/* List */}
      <div className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="rounded-md border border-[var(--line)] bg-[var(--bg-elev)] px-2 py-0.5 font-mono text-[11px] font-bold text-sky-600 dark:text-sky-400">GET</span>
            <code className="font-mono text-[13px] text-[var(--muted)]">/api/v1/webhooks</code>
            {list.result && <StatusPill status={list.result.status} ms={list.result.ms} />}
          </div>
          <button onClick={refresh} className="text-xs font-medium text-teal-600 hover:underline dark:text-teal-400">{list.loading ? "Refreshing…" : "Refresh"}</button>
        </div>

        {hooks.length === 0 ? (
          <p className="rounded-xl border border-dashed border-[var(--line)] px-4 py-6 text-center text-sm text-[var(--muted)]">No webhooks registered.</p>
        ) : (
          <ul className="space-y-2">
            {hooks.map((h) => (
              <li key={h.webhook_id} className="flex items-center justify-between gap-3 rounded-xl border border-[var(--line)] bg-[var(--bg-elev)]/70 px-4 py-3 backdrop-blur">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{h.url}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    <span className={cn("rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase", h.status === "active" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300" : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400")}>{h.status}</span>
                    {h.events.map((e) => (
                      <span key={e} className="font-mono text-[10px] text-[var(--muted)]">{e}</span>
                    ))}
                  </div>
                </div>
                <button onClick={() => remove(h.webhook_id)} disabled={deleting === h.webhook_id} className="shrink-0 rounded-md border border-red-300/60 px-2.5 py-1 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50 dark:border-red-900/60 dark:text-red-400 dark:hover:bg-red-950/40">
                  {deleting === h.webhook_id ? "Deleting…" : "Delete"}
                </button>
              </li>
            ))}
          </ul>
        )}

        {list.result && (
          <details className="mt-4">
            <summary className="cursor-pointer select-none text-xs font-medium text-[var(--muted)] hover:text-teal-600 dark:hover:text-teal-400">Raw JSON</summary>
            <div className="mt-3"><JsonBlock value={list.result.raw} max="max-h-64" /></div>
          </details>
        )}
      </div>
    </div>
  );
}
