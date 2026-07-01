// Structured, reviewable rendering of a parsed resume — the UAT "did the parser
// get it right?" view. Each field is shown plainly so a tester can eyeball the
// extraction (name without credentials, phone captured, full dates, description
// as bullets). A raw-JSON toggle is available for exact-value checks.
"use client";

import { useState } from "react";

import { Badge } from "@/components/ui";
import type { ConfidenceScores, Experience, ParsedResume, SkillsValidation, SpecialtyMatch } from "@/lib/types";

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
  count,
  delay = 0,
  children,
}: {
  title: string;
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
        <span className="h-3.5 w-1 rounded-full bg-accent-600" />
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
  const rows: [string, string | null | undefined][] = [
    ["Profession", e.profession],
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
          <span className={"h-1.5 w-1.5 rounded-full " + (raw ? "bg-accent-500" : "bg-zinc-400")} />
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
            <Section title="Personal" delay={0}>
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
          <Section title="Experience" count={data.experience.length} delay={60}>
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
          <Section title="Education" count={data.education.length} delay={120}>
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
          <Section title="Skills" count={data.skills.length} delay={180}>
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
            <Section title="Certifications" count={data.certifications.length} delay={240}>
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
            <Section title="Languages" count={data.languages.length} delay={300}>
              <Chips items={data.languages} />
            </Section>
          )}

          {/* References */}
          {data.references && data.references.length > 0 && (
            <Section title="References" count={data.references.length} delay={360}>
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
            <Section title="Awards" count={data.awards.length} delay={420}>
              <Chips items={data.awards} tone="success" />
            </Section>
          )}

          {/* Publications */}
          {data.publications && data.publications.length > 0 && (
            <Section title="Publications" count={data.publications.length} delay={480}>
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
