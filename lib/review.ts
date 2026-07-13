/**
 * Review helpers: field-level diffing, and finding the fields a human actually needs
 * to look at.
 *
 * Both the batch detail pane and the compare view use these, so the definition of
 * "what counts as an issue" lives in exactly one place.
 */

import type { ConfidenceScores, ParsedResume } from "./types";

// ── Flatten + diff ────────────────────────────────────────────────────────────

type Leaf = string | number | boolean | null;

/** Flatten a record into dotted paths -> leaf values. Arrays get [i] indices. */
export function flatten(value: unknown, prefix = ""): Record<string, Leaf> {
  const out: Record<string, Leaf> = {};

  const walk = (v: unknown, path: string) => {
    if (v === null || v === undefined) {
      out[path] = null;
      return;
    }
    if (Array.isArray(v)) {
      if (v.length === 0) out[path] = null;
      v.forEach((item, i) => walk(item, `${path}[${i}]`));
      return;
    }
    if (typeof v === "object") {
      const entries = Object.entries(v as Record<string, unknown>);
      if (entries.length === 0) out[path] = null;
      for (const [k, val] of entries) walk(val, path ? `${path}.${k}` : k);
      return;
    }
    out[path] = v as Leaf;
  };

  walk(value, prefix);
  return out;
}

export type Change = { path: string; from: Leaf; to: Leaf; kind: "added" | "removed" | "changed" };

/** Field-level diff between two records. Empty when they are identical. */
export function diffRecords(a: unknown, b: unknown): Change[] {
  const fa = flatten(a);
  const fb = flatten(b);
  const paths = new Set([...Object.keys(fa), ...Object.keys(fb)]);
  const changes: Change[] = [];

  for (const path of [...paths].sort()) {
    const from = path in fa ? fa[path] : null;
    const to = path in fb ? fb[path] : null;
    if (from === to) continue;
    const kind: Change["kind"] =
      !(path in fa) || from === null ? "added" : !(path in fb) || to === null ? "removed" : "changed";
    changes.push({ path, from, to, kind });
  }
  return changes;
}

// ── Issues ────────────────────────────────────────────────────────────────────

export type Issue = {
  severity: "high" | "medium" | "low";
  field: string;
  detail: string;
};

// Below this, a section's confidence is worth a human's attention.
const LOW_CONFIDENCE = 0.7;

/**
 * What a reviewer should actually look at.
 *
 * The parser deliberately returns `null` rather than guessing an id it cannot verify
 * (see the never-fabricate-an-id rule on the specialty, facility and city matchers).
 * That is the right behaviour, but it means the interesting information is spread as
 * nulls across a large record. This surfaces them so a tester does not have to read
 * 300 lines of JSON to notice that no city resolved.
 */
export function findIssues(
  parsed: ParsedResume | null,
  confidence: ConfidenceScores | null,
  warnings: string[] = [],
): Issue[] {
  if (!parsed) return [];
  const issues: Issue[] = [];

  for (const w of warnings) {
    issues.push({ severity: "high", field: "parse", detail: w });
  }

  if (confidence) {
    for (const [key, val] of Object.entries(confidence)) {
      if (typeof val === "number" && val < LOW_CONFIDENCE) {
        issues.push({
          severity: val < 0.5 ? "high" : "medium",
          field: `confidence.${key}`,
          detail: `Low confidence: ${Math.round(val * 100)}%`,
        });
      }
    }
  }

  const pi = parsed.personal_info;
  if (pi) {
    if (!pi.full_name) issues.push({ severity: "high", field: "personal_info.full_name", detail: "No name extracted" });
    if (!pi.email) issues.push({ severity: "medium", field: "personal_info.email", detail: "No email extracted" });
    if (!pi.phone) issues.push({ severity: "low", field: "personal_info.phone", detail: "No phone extracted" });
  }

  (parsed.experience ?? []).forEach((exp, i) => {
    const at = `experience[${i}]`;
    const who = exp.company || "role";

    // The catalog ids are the whole point of the product - an unmapped one is the
    // single most useful thing to show a tester.
    if (!exp.facility_id) {
      issues.push({ severity: "medium", field: `${at}.facility_id`, detail: `"${who}" did not map to a platform facility` });
    }
    if (exp.city && !exp.city_id) {
      issues.push({ severity: "medium", field: `${at}.city_id`, detail: `City "${exp.city}" did not map to a platform city id` });
    }
    if (!exp.country_id || !exp.state_id) {
      issues.push({ severity: "low", field: `${at}.state_id`, detail: `"${who}" is missing a country/state id` });
    }

    const specs = exp.specialties ?? [];
    if (specs.length === 0) {
      issues.push({ severity: "medium", field: `${at}.specialties`, detail: `"${who}" has no specialty` });
    }
    specs.forEach((s, j) => {
      if (!s.specialty_id) {
        issues.push({
          severity: "high",
          field: `${at}.specialties[${j}]`,
          detail: `Specialty "${s.name ?? s.raw}" did not map to a catalog id`,
        });
      }
    });

    if (!exp.start_date) {
      issues.push({ severity: "medium", field: `${at}.start_date`, detail: `"${who}" has no start date` });
    }
    if (exp.gap_warning) {
      issues.push({ severity: "low", field: `${at}.gap_warning`, detail: `Employment gap flagged before "${who}"` });
    }
  });

  (parsed.licenses ?? []).forEach((l, i) => {
    if (!l.state) {
      issues.push({ severity: "low", field: `licenses[${i}].state`, detail: `License "${l.name}" has no state` });
    }
  });

  if ((parsed.experience ?? []).length === 0) {
    issues.push({ severity: "high", field: "experience", detail: "No work history extracted" });
  }

  const order = { high: 0, medium: 1, low: 2 };
  return issues.sort((a, b) => order[a.severity] - order[b.severity]);
}
