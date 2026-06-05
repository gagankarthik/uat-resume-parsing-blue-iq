// Structured, reviewable rendering of a parsed resume — the UAT "did the parser
// get it right?" view. Each field is shown plainly so a tester can eyeball the
// extraction (name without credentials, phone captured, full dates, description
// as bullets). A raw-JSON toggle is available for exact-value checks.
"use client";

import { useState } from "react";

import { Badge } from "@/components/ui";
import type { ConfidenceScores, ParsedResume, SkillsValidation } from "@/lib/types";

function confTone(v: number): "success" | "warning" | "danger" {
  if (v >= 0.8) return "success";
  if (v >= 0.5) return "warning";
  return "danger";
}

// "2024-02-16" → "Feb 16, 2024"; "2024-02-01" → "Feb 2024" guess is unsafe, so
// month-only-looking values still render the day. "Present" passes through.
function fmtDate(d: string | null): string {
  if (!d) return "—";
  if (d.toLowerCase() === "present") return "Present";
  const full = /^(\d{4})-(\d{2})-(\d{2})$/.exec(d);
  if (full) {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const [, y, m, day] = full;
    return `${months[Number(m) - 1] ?? m} ${Number(day)}, ${y}`;
  }
  return d;
}

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-zinc-400">{label}</dt>
      <dd className={value ? "text-sm text-zinc-900 dark:text-zinc-100" : "text-sm text-zinc-400"}>
        {value || "— not captured —"}
      </dd>
    </div>
  );
}

function Section({ title, count, children }: { title: string; count?: number; children: React.ReactNode }) {
  return (
    <section className="border-t border-zinc-200 pt-4 dark:border-zinc-800">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
        {title}
        {typeof count === "number" && (
          <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
            {count}
          </span>
        )}
      </h3>
      {children}
    </section>
  );
}

function Chips({ items, tone = "neutral" }: { items: string[]; tone?: "neutral" | "info" | "success" }) {
  if (!items.length) return <p className="text-sm text-zinc-400">— none —</p>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((s, i) => (
        <Badge key={`${s}-${i}`} tone={tone}>
          {s}
        </Badge>
      ))}
    </div>
  );
}

export function ResumeResult({
  data,
  confidence,
  skillsValidation,
}: {
  data: ParsedResume;
  confidence: ConfidenceScores | null;
  skillsValidation?: SkillsValidation | null;
}) {
  const [raw, setRaw] = useState(false);
  const p = data.personal_info;

  return (
    <div className="space-y-5">
      {/* Confidence summary */}
      {confidence && (
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={confTone(confidence.overall)}>Overall {Math.round(confidence.overall * 100)}%</Badge>
          <Badge tone={confTone(confidence.personal_info)}>Personal {Math.round(confidence.personal_info * 100)}%</Badge>
          <Badge tone={confTone(confidence.experience)}>Experience {Math.round(confidence.experience * 100)}%</Badge>
          <Badge tone={confTone(confidence.education)}>Education {Math.round(confidence.education * 100)}%</Badge>
          <Badge tone={confTone(confidence.skills)}>Skills {Math.round(confidence.skills * 100)}%</Badge>
          <button
            onClick={() => setRaw((v) => !v)}
            className="ml-auto rounded-lg border border-zinc-300 px-2.5 py-1 text-xs font-medium hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
          >
            {raw ? "Structured view" : "Raw JSON"}
          </button>
        </div>
      )}

      {raw ? (
        <pre className="max-h-[34rem] overflow-auto rounded-xl bg-zinc-950 p-4 font-mono text-xs leading-relaxed text-zinc-100">
          {JSON.stringify(data, null, 2)}
        </pre>
      ) : (
        <div className="space-y-5">
          {/* Personal info */}
          {p && (
            <Section title="Personal">
              <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label="Full name" value={p.full_name} />
                <Field label="Phone" value={p.phone} />
                <Field label="Email" value={p.email} />
                <Field label="Location" value={p.location} />
                <Field label="LinkedIn" value={p.linkedin_url} />
                <Field label="Portfolio" value={p.portfolio_url} />
              </dl>
              {p.summary && <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-300">{p.summary}</p>}
            </Section>
          )}

          {/* Experience */}
          <Section title="Experience" count={data.experience.length}>
            {data.experience.length === 0 ? (
              <p className="text-sm text-zinc-400">— none —</p>
            ) : (
              <ol className="space-y-4">
                {data.experience.map((e, i) => (
                  <li key={i} className="rounded-xl border border-zinc-200 p-3.5 dark:border-zinc-800">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                      <p className="font-medium text-zinc-900 dark:text-zinc-100">
                        {e.role || "—"} <span className="font-normal text-zinc-500">· {e.company || "—"}</span>
                      </p>
                      <p className="text-xs text-zinc-500">
                        {fmtDate(e.start_date)} – {fmtDate(e.end_date)}
                        {e.is_current && <span className="ml-1 text-green-600 dark:text-green-400">· current</span>}
                      </p>
                    </div>
                    {e.location && <p className="mt-0.5 text-xs text-zinc-500">{e.location}</p>}
                    {e.description.length > 0 && (
                      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-zinc-700 dark:text-zinc-300">
                        {e.description.map((d, j) => (
                          <li key={j}>{d}</li>
                        ))}
                      </ul>
                    )}
                    {e.achievements.length > 0 && (
                      <ul className="mt-2 list-['✓_'] space-y-1 pl-5 text-sm text-zinc-600 dark:text-zinc-400">
                        {e.achievements.map((a, j) => (
                          <li key={j}>{a}</li>
                        ))}
                      </ul>
                    )}
                  </li>
                ))}
              </ol>
            )}
          </Section>

          {/* Education */}
          <Section title="Education" count={data.education.length}>
            {data.education.length === 0 ? (
              <p className="text-sm text-zinc-400">— none —</p>
            ) : (
              <ul className="space-y-2">
                {data.education.map((ed, i) => (
                  <li key={i} className="text-sm">
                    <span className="font-medium text-zinc-900 dark:text-zinc-100">{ed.degree || ed.field_of_study || "—"}</span>
                    <span className="text-zinc-500"> · {ed.institution || "—"}</span>
                    {(ed.graduation_year || ed.start_year) && (
                      <span className="text-zinc-400">
                        {" "}
                        ({ed.start_year ? `${ed.start_year}–` : ""}
                        {ed.graduation_year ?? ""})
                      </span>
                    )}
                    {ed.gpa && <span className="text-zinc-400"> · GPA {ed.gpa}</span>}
                  </li>
                ))}
              </ul>
            )}
          </Section>

          {/* Skills */}
          <Section title="Skills" count={data.skills.length}>
            <Chips items={data.skills} tone="info" />
            {skillsValidation && (
              <p className="mt-2 text-xs text-zinc-500">
                {skillsValidation.recognized_count}/{skillsValidation.total} recognized in healthcare taxonomy
                {skillsValidation.unrecognized.length > 0 && (
                  <> · unrecognized: {skillsValidation.unrecognized.join(", ")}</>
                )}
              </p>
            )}
          </Section>

          {/* Certifications */}
          {data.certifications.length > 0 && (
            <Section title="Certifications" count={data.certifications.length}>
              <ul className="space-y-1 text-sm">
                {data.certifications.map((c, i) => (
                  <li key={i}>
                    <span className="font-medium text-zinc-900 dark:text-zinc-100">{c.name}</span>
                    {c.issuer && <span className="text-zinc-500"> · {c.issuer}</span>}
                    {c.expiry_date && <span className="text-zinc-400"> · exp {fmtDate(c.expiry_date)}</span>}
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {/* Languages */}
          {data.languages.length > 0 && (
            <Section title="Languages" count={data.languages.length}>
              <Chips items={data.languages} />
            </Section>
          )}

          {/* References */}
          {data.references && data.references.length > 0 && (
            <Section title="References" count={data.references.length}>
              <ul className="space-y-1 text-sm">
                {data.references.map((r, i) => (
                  <li key={i}>
                    <span className="font-medium text-zinc-900 dark:text-zinc-100">{r.name}</span>
                    {r.relationship && <span className="text-zinc-500"> · {r.relationship}</span>}
                    {r.company && <span className="text-zinc-400"> · {r.company}</span>}
                    {(r.email || r.phone) && (
                      <span className="text-zinc-400"> · {[r.email, r.phone].filter(Boolean).join(" / ")}</span>
                    )}
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {/* Awards */}
          {data.awards && data.awards.length > 0 && (
            <Section title="Awards" count={data.awards.length}>
              <Chips items={data.awards} tone="success" />
            </Section>
          )}

          {/* Publications */}
          {data.publications && data.publications.length > 0 && (
            <Section title="Publications" count={data.publications.length}>
              <ul className="list-disc space-y-1 pl-5 text-sm text-zinc-700 dark:text-zinc-300">
                {data.publications.map((pub, i) => (
                  <li key={i}>{pub}</li>
                ))}
              </ul>
            </Section>
          )}
        </div>
      )}
    </div>
  );
}
