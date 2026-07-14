"use client";

import { useState } from "react";

import { Button, Input, Label, Textarea } from "@/components/ui";
import { submitFeedback } from "@/lib/api";
import type { FeedbackResponse, ParsedResume } from "@/lib/types";

import { EndpointHeader, ResponseCard, useCall } from "./shared";

const SAMPLE_ORIGINAL: Partial<ParsedResume> = {
  personal_info: { full_name: "Jane Doe", email: "jane@doe.com", phone: null, location: "Austin, TX", linkedin_url: null, github_url: null, portfolio_url: null, summary: null },
  skills: ["ICU", "Telemetry"],
  experience: [],
  education: [],
  certifications: [],
  projects: [],
  languages: [],
};
const SAMPLE_UPDATED: Partial<ParsedResume> = {
  ...SAMPLE_ORIGINAL,
  personal_info: { ...(SAMPLE_ORIGINAL.personal_info as ParsedResume["personal_info"])!, phone: "+1 512 555 0100" },
  skills: ["ICU", "Telemetry", "PACU"],
};

export function FeedbackPanel() {
  const [jobId, setJobId] = useState("");
  const [original, setOriginal] = useState("");
  const [updated, setUpdated] = useState("");
  const [notes, setNotes] = useState("");
  const [parseError, setParseError] = useState("");
  const { loading, result, run } = useCall<FeedbackResponse>();

  function loadSample() {
    setJobId("01J3K5M2N4P6Q8R0S2T4U6V8W0");
    setOriginal(JSON.stringify(SAMPLE_ORIGINAL, null, 2));
    setUpdated(JSON.stringify(SAMPLE_UPDATED, null, 2));
    setNotes("Added a missing phone number and the PACU specialty.");
    setParseError("");
  }

  async function go() {
    setParseError("");
    let orig: ParsedResume, upd: ParsedResume;
    try {
      orig = JSON.parse(original);
      upd = JSON.parse(updated);
    } catch (e) {
      setParseError(`Invalid JSON: ${e instanceof Error ? e.message : "check both fields"}`);
      return;
    }
    run(() => submitFeedback(jobId.trim(), { original: orig, updated: upd, notes: notes.trim() || undefined }));
  }

  const fb = result?.data;

  return (
    <div>
      <EndpointHeader method="POST" path="/api/v1/resume/{job_id}/feedback" title="Submit feedback" blurb="Send the original parser output alongside the reviewer-corrected version. The API diffs them, records the changed fields (scoped to your account), and uses them to improve accuracy over time." />

      <div className="mb-3 flex items-center justify-between">
        <Label>Job ID</Label>
        <button onClick={loadSample} className="text-xs font-medium text-accent-600 hover:underline dark:text-accent-400">Load sample</button>
      </div>
      <Input value={jobId} onChange={(e) => setJobId(e.target.value)} placeholder="01J3K5M2N4P6Q8R0S2T4U6V8W0" className="mb-4 font-mono" />

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label>Original JSON</Label>
          <Textarea value={original} onChange={(e) => setOriginal(e.target.value)} rows={10} placeholder='{ "personal_info": ... }' className="font-mono text-xs" />
        </div>
        <div>
          <Label>Corrected JSON</Label>
          <Textarea value={updated} onChange={(e) => setUpdated(e.target.value)} rows={10} placeholder='{ "personal_info": ... }' className="font-mono text-xs" />
        </div>
      </div>

      <div className="mt-4">
        <Label>Notes (optional)</Label>
        <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="What did the reviewer change and why?" />
      </div>

      {parseError && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{parseError}</p>}

      <div className="mt-5">
        <Button onClick={go} loading={loading} disabled={!jobId.trim() || !original.trim() || !updated.trim()}>
          {loading ? "Submitting..." : "Submit feedback"}
        </Button>
      </div>

      {fb && (
        <div className="pop-in mt-5 rounded-xl border border-emerald-300/60 bg-emerald-50/70 p-4 dark:border-emerald-900/50 dark:bg-emerald-950/30">
          <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
            Accepted - {fb.changed ? `${fb.changed_fields.length} field${fb.changed_fields.length === 1 ? "" : "s"} changed` : "no changes (positive signal)"}
          </p>
          {fb.changed_fields.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {fb.changed_fields.map((f) => (
                <span key={f} className="rounded-md bg-white/70 px-2 py-0.5 font-mono text-[11px] text-emerald-700 ring-1 ring-inset ring-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 dark:ring-emerald-800">{f}</span>
              ))}
            </div>
          )}
        </div>
      )}

      <ResponseCard result={result} title="POST /resume/{job_id}/feedback" />
    </div>
  );
}
