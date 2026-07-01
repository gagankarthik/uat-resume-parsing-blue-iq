"use client";

import { useState, type ComponentType } from "react";

import { cn } from "@/components/ui";
import { BatchPanel } from "@/components/console/BatchPanel";
import { FeedbackPanel } from "@/components/console/FeedbackPanel";
import { HealthPanel } from "@/components/console/HealthPanel";
import { JobPanel } from "@/components/console/JobPanel";
import { LargeFilePanel } from "@/components/console/LargeFilePanel";
import { ParsePanel } from "@/components/console/ParsePanel";
import { WebhooksPanel } from "@/components/console/WebhooksPanel";
import { Method } from "@/components/console/shared";

interface Item {
  id: string;
  method: string;
  label: string;
  Component: ComponentType;
}
interface Group {
  name: string;
  items: Item[];
}

const NAV: Group[] = [
  {
    name: "Parsing",
    items: [
      { id: "parse", method: "POST", label: "Parse résumé", Component: ParsePanel },
      { id: "batch", method: "POST", label: "Batch parse", Component: BatchPanel },
      { id: "large", method: "POST", label: "Large files", Component: LargeFilePanel },
    ],
  },
  {
    name: "Jobs",
    items: [
      { id: "job", method: "GET", label: "Job status & retry", Component: JobPanel },
      { id: "feedback", method: "POST", label: "Feedback", Component: FeedbackPanel },
    ],
  },
  {
    name: "Platform",
    items: [
      { id: "webhooks", method: "POST", label: "Webhooks", Component: WebhooksPanel },
      { id: "health", method: "GET", label: "Health", Component: HealthPanel },
    ],
  },
];

const ALL = NAV.flatMap((g) => g.items);

export function Console() {
  const [active, setActive] = useState("parse");
  const Active = ALL.find((i) => i.id === active)?.Component ?? ParsePanel;

  return (
    <div className="grid gap-6 lg:grid-cols-[236px_1fr]">
      {/* Sidebar (lg) */}
      <aside className="hidden lg:block">
        <div className="sticky top-24 space-y-6">
          {NAV.map((g) => (
            <div key={g.name}>
              <p className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">{g.name}</p>
              <ul className="space-y-0.5">
                {g.items.map((it) => (
                  <li key={it.id}>
                    <button
                      onClick={() => setActive(it.id)}
                      className={cn(
                        "group flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition-colors",
                        active === it.id
                          ? "bg-teal-50 font-medium text-teal-700 ring-1 ring-inset ring-teal-200 dark:bg-teal-950/40 dark:text-teal-300 dark:ring-teal-900"
                          : "text-[var(--fg)] hover:bg-[var(--bg-elev)]",
                      )}
                    >
                      <span className="w-9 shrink-0"><Method m={it.method} /></span>
                      <span className="truncate">{it.label}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </aside>

      {/* Mobile tab bar */}
      <div className="scroll-fine -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 lg:hidden">
        {ALL.map((it) => (
          <button
            key={it.id}
            onClick={() => setActive(it.id)}
            className={cn(
              "shrink-0 rounded-full border px-3.5 py-1.5 text-sm transition-colors",
              active === it.id ? "border-teal-500 bg-teal-50 font-medium text-teal-700 dark:bg-teal-950/40 dark:text-teal-300" : "border-[var(--line)] text-[var(--muted)]",
            )}
          >
            {it.label}
          </button>
        ))}
      </div>

      {/* Active panel */}
      <section className="reveal min-w-0 rounded-3xl border border-[var(--line)] bg-[var(--bg-elev)]/50 p-5 shadow-xl shadow-black/5 backdrop-blur-md sm:p-7">
        <Active />
      </section>
    </div>
  );
}
