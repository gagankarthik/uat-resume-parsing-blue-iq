// Structured, reviewable rendering of a parsed resume — the UAT "did the parser
// get it right?" view. Each field is shown plainly so a tester can eyeball the
// extraction (name without credentials, phone captured, full dates, description
// as bullets). A raw-JSON toggle is available for exact-value checks.
"use client";

import { useState } from "react";

import { Badge } from "@/components/ui";
import type { ConfidenceScores, Experience, ParsedResume, SkillsValidation, SpecialtyMatch } from "@/lib/types";

// Inline SVG icon set (Heroicons-style, stroke=currentColor) — the app ships no
// icon dependency, so these keep the bundle lean and the CSP strict.
const ICON_PATHS = {
  user: "M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.5 20.25a7.5 7.5 0 0 1 15 0",
  briefcase:
    "M20.25 14.15v4.07c0 1.31-.94 2.45-2.24 2.6-1.87.22-3.76.33-5.68.33s-3.81-.11-5.68-.33c-1.3-.15-2.24-1.29-2.24-2.6v-4.07M21 12.6a48.5 48.5 0 0 1-18 0M6.75 7.5V6a2.25 2.25 0 0 1 2.25-2.25h6A2.25 2.25 0 0 1 17.25 6v1.5m-10.5 0h10.5a2.25 2.25 0 0 1 2.25 2.25v3.1a2.25 2.25 0 0 1-1.5 2.12M6.75 7.5A2.25 2.25 0 0 0 4.5 9.75v3.1a2.25 2.25 0 0 0 1.5 2.12M12 12.75h.008v.008H12v-.008Z",
  education: "M4.26 10.15v4.32c0 .82.44 1.58 1.2 1.9 1.87.78 3.9 1.2 6.04 1.2s4.17-.42 6.04-1.2c.76-.32 1.2-1.08 1.2-1.9v-4.32M12 14.25 2.25 9 12 3.75 21.75 9 12 14.25Zm0 0v6.06m6.75-8.31v5.06",
  sparkles:
    "M9.81 15.19 9 18l-.81-2.81a4.5 4.5 0 0 0-3.09-3.09L2.25 11.25l2.85-.81a4.5 4.5 0 0 0 3.09-3.09L9 4.5l.81 2.85a4.5 4.5 0 0 0 3.09 3.09l2.85.81-2.85.81a4.5 4.5 0 0 0-3.09 3.13ZM18 6l.38 1.35a2.25 2.25 0 0 0 1.54 1.54L21.25 9l-1.33.38a2.25 2.25 0 0 0-1.54 1.54L18 12.25l-.38-1.33a2.25 2.25 0 0 0-1.54-1.54L14.75 9l1.33-.11a2.25 2.25 0 0 0 1.54-1.54L18 6Z",
  badge:
    "M9 12.75 11.25 15 15 9.75M21 12c0 1.27-.79 2.36-1.9 2.8.29 1.17-.02 2.45-.93 3.37-.92.91-2.2 1.22-3.37.93A3 3 0 0 1 12 21a3 3 0 0 1-2.8-1.9c-1.17.29-2.45-.02-3.37-.93-.91-.92-1.22-2.2-.93-3.37A3 3 0 0 1 3 12c0-1.27.79-2.36 1.9-2.8-.29-1.17.02-2.45.93-3.37.92-.91 2.2-1.22 3.37-.93A3 3 0 0 1 12 3a3 3 0 0 1 2.8 1.9c1.17-.29 2.45.02 3.37.93.91.92 1.22 2.2.93 3.37A3 3 0 0 1 21 12Z",
  globe:
    "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0 0c2.49 0 4.5-4.03 4.5-9S14.49 3 12 3 7.5 7.03 7.5 12s2.01 9 4.5 9Zm-9-9h18",
  users:
    "M15 19.13v-.38a5.25 5.25 0 0 0-10.5 0v.38m15-.38a5.25 5.25 0 0 0-9-3.68M18.75 6a2.63 2.63 0 1 1-5.25 0 2.63 2.63 0 0 1 5.25 0ZM12.75 8.63a2.63 2.63 0 1 1-5.25 0 2.63 2.63 0 0 1 5.25 0Z",
  trophy:
    "M16.5 18.75h-9m9 0a3 3 0 0 1 3 3h-15a3 3 0 0 1 3-3m9 0v-3.38m-9 3.38v-3.38m0 0a8.9 8.9 0 0 1-2.87-.66M7.5 15.37V6h9v9.37m0 0a8.9 8.9 0 0 0 2.87-.66M16.5 6h2.62c.63 0 1.13.5 1.13 1.12v.51a3.75 3.75 0 0 1-2.9 3.65M7.5 6H4.88c-.63 0-1.13.5-1.13 1.12v.51a3.75 3.75 0 0 0 2.9 3.65",
  document:
    "M19.5 14.25v-2.63c0-4.13-3-7.62-7-8.31M19.5 14.25v4.5a2.25 2.25 0 0 1-2.25 2.25h-10.5A2.25 2.25 0 0 1 4.5 18.75V5.25A2.25 2.25 0 0 1 6.75 3h5.53M19.5 14.25h-4.13a2.25 2.25 0 0 1-2.25-2.25V7.87M8.25 8.25h1.5m-1.5 3h4.5m-4.5 3h6",
  code: "M17.25 6.75 22.5 12l-5.25 5.25M6.75 17.25 1.5 12l5.25-5.25M14.25 3.75l-4.5 16.5",
  list: "M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.008v.008H3.75V6.75Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0ZM3.75 12h.008v.008H3.75V12Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm-.375 5.25h.008v.008H3.75v-.008Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z",
  info: "M11.25 11.25l.04-.02a.75.75 0 0 1 1.06.74l-.53 2.56a.75.75 0 0 0 1.06.74l.04-.02M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z",
} as const;
type IconName = keyof typeof ICON_PATHS;

function Icon({ name, className = "h-4 w-4" }: { name: IconName; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d={ICON_PATHS[name]} />
    </svg>
  );
}

function confTone(v: number): "success" | "warning" | "danger" {
  if (v >= 0.8) return "success";
  if (v >= 0.5) return "warning";
  return "danger";
}

// The API emits MM/DD/YYYY, MM/YYYY, YYYY, or "Present" — preserving whatever
// precision the resume stated. Render each nicely; never invent a missing part.
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function fmtDate(d: string | null | undefined): string {
  if (!d) return "—";
  if (d.toLowerCase() === "present") return "Present";
  let m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(d); // MM/DD/YYYY
  if (m) return `${MONTHS[Number(m[1]) - 1] ?? m[1]} ${Number(m[2])}, ${m[3]}`;
  m = /^(\d{2})\/(\d{4})$/.exec(d); // MM/YYYY
  if (m) return `${MONTHS[Number(m[1]) - 1] ?? m[1]} ${m[2]}`;
  return d; // YYYY or anything else, as-is
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

function Section({
  title,
  icon,
  count,
  delay = 0,
  children,
}: {
  title: string;
  icon?: IconName;
  count?: number;
  delay?: number;
  children: React.ReactNode;
}) {
  return (
    <section
      className="reveal border-t border-[var(--line)] pt-4"
      style={{ animationDelay: `${delay}ms` }}
    >
      <h3 className="mb-3 flex items-center gap-2 text-[13px] font-semibold uppercase tracking-wider text-[var(--muted)]">
        {icon ? (
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-lg bg-accent-50 text-accent-600 dark:bg-accent-900/40 dark:text-accent-300">
            <Icon name={icon} className="h-3.5 w-3.5" />
          </span>
        ) : (
          <span className="h-3.5 w-1 rounded-full bg-accent-600" />
        )}
        {title}
        {typeof count === "number" && (
          <span className="rounded-full bg-accent-50 px-2 py-0.5 text-[11px] font-semibold text-accent-700 dark:bg-accent-900/40 dark:text-accent-300">
            {count}
          </span>
        )}
      </h3>
      {children}
    </section>
  );
}

// Compact key/value grid for the optional "Edit Work History" fields — only the
// values the parser actually captured are shown.
function WorkDetails({ e }: { e: Experience }) {
  const professionId =
    e.profession_id != null
      ? `#${e.profession_id}${
          typeof e.profession_confidence === "number" ? ` · ${e.profession_confidence.toFixed(2)}` : ""
        }`
      : null;
  const facilityId = e.facility_id != null ? `#${e.facility_id}` : null;
  const rows: [string, string | null | undefined][] = [
    ["Profession", e.profession],
    ["Profession ID", professionId],
    ["Facility ID", facilityId],
    ["Position held", e.position_held],
    ["Shift", e.shift],
    ["Charting system", e.charting_system],
    ["Agency", e.agency_name],
    ["Nurse-to-patient ratio", e.nurse_to_patient_ratio],
    ["Beds in unit", e.beds_in_unit],
    ["Facility beds", e.facility_beds],
    ["Service type", e.service_type],
    ["Teaching facility", e.teaching_facility],
    ["Magnet facility", e.magnet_facility],
    ["Trauma facility", e.trauma_facility],
    ["Trauma level", e.trauma_level],
    ["Charge experience", e.charge_experience],
    ["ZIP code", e.zip_code],
    ["Employer phone", e.employer_phone],
    ["Reason for leaving", e.reason_for_leaving],
    ["Additional info", e.additional_info],
  ];
  const shown = rows.filter(([, v]) => v);
  if (shown.length === 0) return null;
  return (
    <dl className="mt-2.5 grid grid-cols-1 gap-x-4 gap-y-1 sm:grid-cols-2">
      {shown.map(([label, value]) => (
        <div key={label} className="flex gap-1.5 text-xs">
          <dt className="shrink-0 font-medium text-zinc-400">{label}:</dt>
          <dd className="text-zinc-700 dark:text-zinc-300">{value}</dd>
        </div>
      ))}
    </dl>
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

// Per-role specialties now arrive as objects mapped to the platform catalog. Show
// the platform's exact name plus its id + confidence so a tester can verify the
// mapping; an unmatched specialty (no id) is flagged amber for review, not hidden.
// Tolerates a plain string too, in case of an older API response.
function SpecialtyChips({ items }: { items: Array<SpecialtyMatch | string> }) {
  if (!items.length) return <p className="text-sm text-zinc-400">— none —</p>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((raw, i) => {
        const s: SpecialtyMatch = typeof raw === "string" ? { name: raw } : raw;
        const matched = Boolean(s.specialty_id);
        const conf = typeof s.confidence === "number" ? s.confidence : undefined;
        return (
          <Badge key={`${s.name}-${i}`} tone={matched ? "info" : "warning"}>
            {s.name || "—"}
            {matched ? (
              <span className="ml-1.5 font-mono text-[10px] opacity-70">
                #{s.specialty_id}
                {conf !== undefined ? ` · ${conf.toFixed(2)}` : ""}
                {s.match_tier ? ` · ${s.match_tier}` : ""}
              </span>
            ) : (
              <span className="ml-1.5 text-[10px] font-medium opacity-80">· no id · review</span>
            )}
          </Badge>
        );
      })}
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
      {/* Confidence summary + view toggle (toggle always available) */}
      <div className="flex flex-wrap items-center gap-2">
        {confidence && (
          <>
            <Badge tone={confTone(confidence.overall)}>Overall {Math.round(confidence.overall * 100)}%</Badge>
            <Badge tone={confTone(confidence.personal_info)}>Personal {Math.round(confidence.personal_info * 100)}%</Badge>
            <Badge tone={confTone(confidence.experience)}>Experience {Math.round(confidence.experience * 100)}%</Badge>
            <Badge tone={confTone(confidence.education)}>Education {Math.round(confidence.education * 100)}%</Badge>
            <Badge tone={confTone(confidence.skills)}>Skills {Math.round(confidence.skills * 100)}%</Badge>
          </>
        )}
        <button
          onClick={() => setRaw((v) => !v)}
          className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-[var(--line)] bg-[var(--bg-elev)] px-2.5 py-1 text-xs font-medium text-[var(--fg)] transition-colors hover:border-accent-400 hover:text-accent-600 dark:hover:text-accent-400"
        >
          <Icon name={raw ? "list" : "code"} className="h-3.5 w-3.5" />
          {raw ? "Structured view" : "Raw JSON"}
        </button>
      </div>

      {raw ? (
        <pre className="scroll-fine fade-in max-h-[34rem] overflow-auto rounded-2xl border border-accent-900/40 bg-[#06100e] p-4 font-mono text-xs leading-relaxed text-accent-50 shadow-inner">
          {JSON.stringify(data, null, 2)}
        </pre>
      ) : (
        <div className="space-y-5">
          {/* Personal info */}
          {p && (
            <Section title="Personal" icon="user" delay={0}>
              <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label="Full name" value={p.full_name} />
                <Field label="Phone" value={p.phone} />
                <Field label="Email" value={p.email} />
                <Field label="Location" value={p.location} />
                <Field label="LinkedIn" value={p.linkedin_url} />
                <Field label="Portfolio" value={p.portfolio_url} />
              </dl>
              {p.summary && <p className="mt-3 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">{p.summary}</p>}
            </Section>
          )}

          {/* Experience */}
          <Section title="Experience" icon="briefcase" count={data.experience.length} delay={60}>
            {data.experience.length === 0 ? (
              <p className="text-sm text-zinc-400">— none —</p>
            ) : (
              <ol className="space-y-3">
                {data.experience.map((e, i) => (
                  <li
                    key={i}
                    className="rounded-2xl border border-[var(--line)] bg-[var(--bg)]/40 p-4 transition-colors hover:border-accent-300/70 dark:hover:border-accent-800/70"
                  >
                    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                      <p className="font-medium text-zinc-900 dark:text-zinc-100">
                        {e.role || "—"} <span className="font-normal text-[var(--muted)]">· {e.company || "—"}</span>
                      </p>
                      <p className="font-mono text-xs text-[var(--muted)]">
                        {fmtDate(e.start_date)} – {fmtDate(e.end_date)}
                        {e.is_current && <span className="ml-1 font-sans text-accent-600 dark:text-accent-400">· current</span>}
                      </p>
                    </div>
                    {e.location && <p className="mt-0.5 text-xs text-zinc-500">{e.location}</p>}
                    {e.specialties && e.specialties.length > 0 && (
                      <div className="mt-2">
                        <SpecialtyChips items={e.specialties} />
                      </div>
                    )}
                    <WorkDetails e={e} />
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
          <Section title="Education" icon="education" count={data.education.length} delay={120}>
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
          <Section title="Skills" icon="sparkles" count={data.skills.length} delay={180}>
            <Chips items={data.skills} tone="info" />
            {skillsValidation && (
              <p className="mt-2.5 text-xs text-[var(--muted)]">
                <span className="font-semibold text-accent-600 dark:text-accent-400">
                  {skillsValidation.recognized_count}/{skillsValidation.total}
                </span>{" "}
                recognized in healthcare taxonomy
                {skillsValidation.unrecognized.length > 0 && (
                  <> · unrecognized: {skillsValidation.unrecognized.join(", ")}</>
                )}
              </p>
            )}
          </Section>

          {/* Certifications */}
          {data.certifications.length > 0 && (
            <Section title="Certifications" icon="badge" count={data.certifications.length} delay={240}>
              <ul className="space-y-1 text-sm">
                {data.certifications.map((c, i) => (
                  <li key={i}>
                    <span className="font-medium text-zinc-900 dark:text-zinc-100">{c.name}</span>
                    {c.issuer && <span className="text-zinc-500"> · {c.issuer}</span>}
                    {c.issued_date && <span className="text-zinc-400"> · issued {fmtDate(c.issued_date)}</span>}
                    {c.expiry_date && <span className="text-zinc-400"> · exp {fmtDate(c.expiry_date)}</span>}
                    {c.date && !c.issued_date && !c.expiry_date && (
                      <span className="text-zinc-400"> · {fmtDate(c.date)}</span>
                    )}
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {/* Languages */}
          {data.languages.length > 0 && (
            <Section title="Languages" icon="globe" count={data.languages.length} delay={300}>
              <Chips items={data.languages} />
            </Section>
          )}

          {/* References */}
          {data.references && data.references.length > 0 && (
            <Section title="References" icon="users" count={data.references.length} delay={360}>
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
            <Section title="Awards" icon="trophy" count={data.awards.length} delay={420}>
              <Chips items={data.awards} tone="success" />
            </Section>
          )}

          {/* Publications */}
          {data.publications && data.publications.length > 0 && (
            <Section title="Publications" icon="document" count={data.publications.length} delay={480}>
              <ul className="list-disc space-y-1 pl-5 text-sm text-zinc-700 dark:text-zinc-300">
                {data.publications.map((pub, i) => (
                  <li key={i}>{pub}</li>
                ))}
              </ul>
            </Section>
          )}

          {data.extraction_notes && data.extraction_notes.length > 0 && (
            <Section
              title="Extraction Notes"
              icon="info"
              count={data.extraction_notes.length}
              delay={540}
            >
              <p className="mb-2 text-xs text-zinc-500 dark:text-zinc-400">
                Why the parser assigned or left out an ambiguous value. Correct any of these via
                feedback to improve future parses.
              </p>
              <ul className="space-y-2">
                {data.extraction_notes.map((n, i) => (
                  <li
                    key={i}
                    className="rounded-md border border-amber-200 bg-amber-50 p-2.5 text-sm dark:border-amber-900/50 dark:bg-amber-950/30"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <code className="font-mono text-xs text-amber-800 dark:text-amber-300">
                        {n.field}
                      </code>
                      <span className="shrink-0 text-xs text-zinc-500 dark:text-zinc-400">
                        {n.value === null ? "left null" : `= ${n.value}`} · conf{" "}
                        {n.confidence.toFixed(2)}
                      </span>
                    </div>
                    <p className="mt-1 text-zinc-700 dark:text-zinc-300">{n.reason}</p>
                  </li>
                ))}
              </ul>
            </Section>
          )}
        </div>
      )}
    </div>
  );
}
