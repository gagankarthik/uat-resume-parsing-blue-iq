"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import { Badge, Button, Card, ErrorBanner, Input, Label, SectionTitle, Spinner, Textarea } from "@/components/ui";
import { getJobStatus, parseResume } from "@/lib/api";
import { getSettings } from "@/lib/settings";
import { ApiError, type ConfidenceScores, type ParsedResume, type PersonalInfo } from "@/lib/types";

const ACCEPT = ".pdf,.docx,.png,.jpg,.jpeg,.tiff,.tif,.webp";

function errMsg(e: unknown): string {
  if (e instanceof ApiError) return e.message;
  if (e instanceof Error) return e.message;
  return "Unexpected error";
}

function humanSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export default function TestPage() {
  const [file, setFile] = useState<File | null>(null);
  const [phase, setPhase] = useState<"idle" | "parsing" | "polling" | "done" | "error">("idle");
  const [error, setError] = useState("");
  const [data, setData] = useState<ParsedResume | null>(null);
  const [confidence, setConfidence] = useState<ConfidenceScores | null>(null);
  const [rawOpen, setRawOpen] = useState(false);
  const [raw, setRaw] = useState<unknown>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const hasKey = typeof window !== "undefined" && !!getSettings().apiKey;

  const applyResult = useCallback((d: ParsedResume | null, c: ConfidenceScores | null) => {
    setData(d);
    setConfidence(c);
    setPhase("done");
  }, []);

  const poll = useCallback(
    async (jobId: string) => {
      for (let i = 0; i < 60; i++) {
        await new Promise((r) => setTimeout(r, 2000));
        try {
          const jr = await getJobStatus(jobId);
          if (jr.status === "completed") {
            setRaw(jr);
            applyResult(jr.data, jr.confidence);
            return;
          }
          if (jr.status === "failed") {
            setError(jr.error || "Parsing failed");
            setPhase("error");
            return;
          }
        } catch (e) {
          setError(errMsg(e));
          setPhase("error");
          return;
        }
      }
      setError("Timed out waiting for the async job. Try 'Check again' shortly.");
      setPhase("error");
    },
    [applyResult],
  );

  async function onParse() {
    if (!file) return;
    setError("");
    setData(null);
    setConfidence(null);
    setRaw(null);
    setPhase("parsing");
    try {
      const res = await parseResume(file);
      setRaw(res);
      if (res.status === "completed") {
        applyResult(res.data, res.confidence);
      } else {
        setPhase("polling");
        await poll(res.job_id);
      }
    } catch (e) {
      setError(errMsg(e));
      setPhase("error");
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Test the Parser</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Upload a resume and the extracted fields fill the editable boxes below — exactly what a
          client would auto-fill into their candidate form.
        </p>
      </div>

      {!hasKey && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
          No API key set —{" "}
          <Link href="/settings" className="font-medium underline">
            add one in Settings
          </Link>{" "}
          (or create one under API Keys).
        </div>
      )}

      <Card>
        <SectionTitle hint="PDF, DOCX, or image. Max 10 MB (≈6 MB via the current endpoint).">Upload</SectionTitle>
        <div className="flex flex-wrap items-center gap-3">
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPT}
            className="hidden"
            onChange={(e) => {
              setFile(e.target.files?.[0] ?? null);
              setPhase("idle");
            }}
          />
          <Button variant="secondary" onClick={() => inputRef.current?.click()} type="button">
            Choose file
          </Button>
          <span className="text-sm text-zinc-600 dark:text-zinc-400">
            {file ? `${file.name} · ${humanSize(file.size)}` : "No file selected"}
          </span>
          <Button onClick={onParse} loading={phase === "parsing" || phase === "polling"} disabled={!file}>
            Parse résumé
          </Button>
        </div>
        {phase === "polling" && (
          <p className="mt-3 flex items-center gap-2 text-sm text-zinc-500">
            <Spinner /> Async OCR job in progress…
          </p>
        )}
      </Card>

      {error && <ErrorBanner message={error} />}

      {confidence && <ConfidencePanel c={confidence} />}

      {data && <ResultForm data={data} />}

      {raw != null && (
        <Card>
          <button
            onClick={() => setRawOpen((v) => !v)}
            className="text-sm font-medium text-indigo-600 hover:underline dark:text-indigo-400"
          >
            {rawOpen ? "Hide" : "Show"} raw JSON
          </button>
          {rawOpen && (
            <pre className="mt-3 max-h-96 overflow-auto rounded-lg bg-zinc-950 p-4 font-mono text-xs text-zinc-100">
              {JSON.stringify(raw, null, 2)}
            </pre>
          )}
        </Card>
      )}
    </div>
  );
}

// ── Confidence ────────────────────────────────────────────────────────────────

const CONF_FIELDS: Array<[keyof ConfidenceScores, string]> = [
  ["overall", "Overall"],
  ["personal_info", "Personal info"],
  ["experience", "Experience"],
  ["education", "Education"],
  ["skills", "Skills"],
];

function tone(v: number): string {
  if (v >= 0.9) return "bg-green-500";
  if (v >= 0.7) return "bg-amber-500";
  return "bg-red-500";
}

function ConfidencePanel({ c }: { c: ConfidenceScores }) {
  return (
    <Card>
      <SectionTitle>Confidence</SectionTitle>
      <div className="grid gap-3 sm:grid-cols-2">
        {CONF_FIELDS.map(([k, label]) => {
          const v = Number(c[k] ?? 0);
          return (
            <div key={k}>
              <div className="mb-1 flex justify-between text-xs text-zinc-600 dark:text-zinc-400">
                <span>{label}</span>
                <span>{Math.round(v * 100)}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
                <div className={`h-full ${tone(v)}`} style={{ width: `${Math.round(v * 100)}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

// ── Editable result form ──────────────────────────────────────────────────────

function field(v: string | number | null | undefined): string {
  return v === null || v === undefined ? "" : String(v);
}

function ResultForm({ data }: { data: ParsedResume }) {
  // Local editable copy so the operator can tweak values like an auto-fill form.
  const [form, setForm] = useState(() => structuredClone(data));

  useEffect(() => {
    setForm(structuredClone(data));
  }, [data]);

  const p = form.personal_info;

  return (
    <div className="space-y-6">
      <Card>
        <SectionTitle hint="Editable — mimics populating a candidate form.">Personal information</SectionTitle>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Full name" value={field(p?.full_name)} onChange={(v) => setForm((f) => ({ ...f, personal_info: { ...(f.personal_info ?? emptyPI()), full_name: v } }))} />
          <Field label="Email" value={field(p?.email)} onChange={(v) => setForm((f) => ({ ...f, personal_info: { ...(f.personal_info ?? emptyPI()), email: v } }))} />
          <Field label="Phone" value={field(p?.phone)} onChange={(v) => setForm((f) => ({ ...f, personal_info: { ...(f.personal_info ?? emptyPI()), phone: v } }))} />
          <Field label="Location" value={field(p?.location)} onChange={(v) => setForm((f) => ({ ...f, personal_info: { ...(f.personal_info ?? emptyPI()), location: v } }))} />
          <Field label="LinkedIn" value={field(p?.linkedin_url)} onChange={(v) => setForm((f) => ({ ...f, personal_info: { ...(f.personal_info ?? emptyPI()), linkedin_url: v } }))} />
          <Field label="GitHub" value={field(p?.github_url)} onChange={(v) => setForm((f) => ({ ...f, personal_info: { ...(f.personal_info ?? emptyPI()), github_url: v } }))} />
          <Field label="Portfolio" value={field(p?.portfolio_url)} onChange={(v) => setForm((f) => ({ ...f, personal_info: { ...(f.personal_info ?? emptyPI()), portfolio_url: v } }))} />
        </div>
        <div className="mt-4">
          <Label>Summary</Label>
          <Textarea
            rows={4}
            value={field(p?.summary)}
            onChange={(e) => setForm((f) => ({ ...f, personal_info: { ...(f.personal_info ?? emptyPI()), summary: e.target.value } }))}
          />
        </div>
      </Card>

      <Card>
        <SectionTitle>Skills & languages</SectionTitle>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>Skills (comma-separated)</Label>
            <Textarea
              rows={3}
              value={form.skills.join(", ")}
              onChange={(e) => setForm((f) => ({ ...f, skills: splitList(e.target.value) }))}
            />
            <div className="mt-2 flex flex-wrap gap-1.5">
              {form.skills.map((s, i) => (
                <Badge key={i} tone="info">
                  {s}
                </Badge>
              ))}
            </div>
          </div>
          <div>
            <Label>Languages (comma-separated)</Label>
            <Textarea
              rows={3}
              value={form.languages.join(", ")}
              onChange={(e) => setForm((f) => ({ ...f, languages: splitList(e.target.value) }))}
            />
          </div>
        </div>
      </Card>

      {form.experience.length > 0 && (
        <Card>
          <SectionTitle>Experience</SectionTitle>
          <div className="space-y-4">
            {form.experience.map((x, i) => (
              <div key={i} className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Role" value={field(x.role)} onChange={(v) => updateExp(setForm, i, "role", v)} />
                  <Field label="Company" value={field(x.company)} onChange={(v) => updateExp(setForm, i, "company", v)} />
                  <Field label="Start" value={field(x.start_date)} onChange={(v) => updateExp(setForm, i, "start_date", v)} />
                  <Field
                    label="End"
                    value={x.is_current ? "Present" : field(x.end_date)}
                    onChange={(v) => updateExp(setForm, i, "end_date", v)}
                  />
                  <Field label="Location" value={field(x.location)} onChange={(v) => updateExp(setForm, i, "location", v)} />
                </div>
                <div className="mt-3">
                  <Label>Description</Label>
                  <Textarea rows={2} value={field(x.description)} onChange={(e) => updateExp(setForm, i, "description", e.target.value)} />
                </div>
                {x.achievements.length > 0 && (
                  <ul className="mt-2 list-disc space-y-0.5 pl-5 text-sm text-zinc-600 dark:text-zinc-400">
                    {x.achievements.map((a, j) => (
                      <li key={j}>{a}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {form.education.length > 0 && (
        <Card>
          <SectionTitle>Education</SectionTitle>
          <div className="space-y-4">
            {form.education.map((ed, i) => (
              <div key={i} className="grid gap-3 rounded-xl border border-zinc-200 p-4 dark:border-zinc-800 sm:grid-cols-2">
                <Field label="Institution" value={field(ed.institution)} onChange={(v) => updateEdu(setForm, i, "institution", v)} />
                <Field label="Degree" value={field(ed.degree)} onChange={(v) => updateEdu(setForm, i, "degree", v)} />
                <Field label="Field of study" value={field(ed.field_of_study)} onChange={(v) => updateEdu(setForm, i, "field_of_study", v)} />
                <Field
                  label="Graduation year"
                  value={field(ed.graduation_year)}
                  onChange={(v) => updateEduYear(setForm, i, v)}
                />
              </div>
            ))}
          </div>
        </Card>
      )}

      {(form.certifications.length > 0 || form.projects.length > 0) && (
        <Card>
          <SectionTitle>Certifications & projects</SectionTitle>
          {form.certifications.length > 0 && (
            <div className="mb-3">
              <p className="mb-1 text-sm font-medium text-zinc-700 dark:text-zinc-300">Certifications</p>
              <ul className="list-disc space-y-0.5 pl-5 text-sm text-zinc-600 dark:text-zinc-400">
                {form.certifications.map((c, i) => (
                  <li key={i}>
                    {field(c.name)}
                    {c.issuer ? ` — ${c.issuer}` : ""}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {form.projects.length > 0 && (
            <div>
              <p className="mb-1 text-sm font-medium text-zinc-700 dark:text-zinc-300">Projects</p>
              <ul className="list-disc space-y-0.5 pl-5 text-sm text-zinc-600 dark:text-zinc-400">
                {form.projects.map((pr, i) => (
                  <li key={i}>
                    {field(pr.name)}
                    {pr.technologies.length ? ` — ${pr.technologies.join(", ")}` : ""}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <Label>{label}</Label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder="—" />
    </div>
  );
}

function splitList(s: string): string[] {
  return s
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

function emptyPI(): PersonalInfo {
  return {
    full_name: null,
    email: null,
    phone: null,
    location: null,
    linkedin_url: null,
    github_url: null,
    portfolio_url: null,
    summary: null,
  };
}

type SetForm = React.Dispatch<React.SetStateAction<ParsedResume>>;

// Only the string-valued fields are editable via free text.
type ExpStringKey = "role" | "company" | "start_date" | "end_date" | "location" | "description";
type EduStringKey = "institution" | "degree" | "field_of_study";

function updateExp(setForm: SetForm, idx: number, key: ExpStringKey, value: string) {
  setForm((f) => ({
    ...f,
    experience: f.experience.map((x, i) => (i === idx ? { ...x, [key]: value } : x)),
  }));
}

function updateEdu(setForm: SetForm, idx: number, key: EduStringKey, value: string) {
  setForm((f) => ({
    ...f,
    education: f.education.map((x, i) => (i === idx ? { ...x, [key]: value } : x)),
  }));
}

function updateEduYear(setForm: SetForm, idx: number, value: string) {
  const year = value.trim() === "" ? null : Number(value);
  setForm((f) => ({
    ...f,
    education: f.education.map((x, i) =>
      i === idx ? { ...x, graduation_year: Number.isFinite(year) ? year : null } : x,
    ),
  }));
}
