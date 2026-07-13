// Types shared across the UAT console: resume-parser API shapes + API-key admin.

export interface PersonalInfo {
  full_name: string | null;
  email: string | null;
  phone: string | null;
  location: string | null;
  linkedin_url: string | null;
  github_url: string | null;
  portfolio_url: string | null;
  summary: string | null;
}

// A per-role specialty mapped to the platform catalog by the parser's tiered
// matcher. Unmatched specialties still arrive (specialty_id null, matched false)
// so a reviewer can see what didn't map rather than it being silently dropped.
export interface SpecialtyMatch {
  name: string;
  raw?: string | null;
  specialty_id?: string | null;
  group?: string | null;
  confidence?: number;
  matched?: boolean;
  match_tier?: "name" | "full_name" | "keywords" | "fuzzy" | "ai" | null;
}

export interface Experience {
  company: string | null;
  role: string | null;
  start_date: string | null;
  end_date: string | null;
  is_current: boolean | null;
  location: string | null;
  // Structured facility location (Edit Work History form)
  city?: string | null;
  state?: string | null;
  country?: string | null;
  zip_code?: string | null;
  employer_phone?: string | null;
  // Clinical classification
  profession?: string | null;
  // Platform profession id mapped from `profession` (e.g. RN → "1"), with the
  // system's confidence it is correct (1.0 on an exact catalog match).
  profession_id?: string | null;
  profession_confidence?: number;
  // Facility mapping — reserved; populated once the client's facilities dataset is
  // wired. Null / 0.0 until then.
  facility_id?: string | null;
  facility_confidence?: number;
  specialties?: SpecialtyMatch[];
  // Facility attributes
  service_type?: string | null;
  nurse_to_patient_ratio?: string | null;
  facility_beds?: string | null;
  beds_in_unit?: string | null;
  teaching_facility?: string | null;
  magnet_facility?: string | null;
  trauma_facility?: string | null;
  trauma_level?: string | null;
  additional_info?: string | null;
  // Position details
  position_held?: string | null;
  agency_name?: string | null;
  charge_experience?: string | null;
  charting_system?: string | null;
  shift?: string | null;
  employment_type?: string | null; // Full-time | Part-time | PRN
  patient_load?: string | null; // patient count (ratios go in nurse_to_patient_ratio)
  reason_for_leaving?: string | null;
  gap_warning?: boolean; // system-set: >90-day gap before this role
  description: string[]; // one item per responsibility/bullet
  achievements: string[];
}

// A student clinical rotation / practicum — kept separate from paid experience.
export interface ClinicalRotation {
  institution: string | null;
  unit: string | null;
  role: string | null;
  hours: string | null;
  start_date: string | null;
  end_date: string | null;
  description: string[];
}

// Compliance disclosures scanned from the résumé + a rollup risk flag.
export interface ComplianceInfo {
  covid_vaccination: boolean | null;
  tb_test: boolean | null;
  annual_physical: boolean | null;
  compliance_risk: boolean;
}

export interface Reference {
  name: string | null;
  relationship: string | null;
  company: string | null;
  email: string | null;
  phone: string | null;
}

export interface Education {
  institution: string | null;
  degree: string | null;
  field_of_study: string | null;
  start_year: number | null;
  graduation_year: number | null;
  gpa: string | null;
  tier?: string | null; // ADN | Diploma_in_Nursing | BSN (nursing degrees)
}

export interface Certification {
  name: string | null;
  issuer: string | null;
  issued_date: string | null;
  expiry_date: string | null;
  date: string | null; // unlabeled date (not known to be issue vs expiry)
  credential_id: string | null;
}

export interface Project {
  name: string | null;
  description: string | null;
  technologies: string[];
  url: string | null;
}

// An explainable extraction decision — why a value was assigned or (more often)
// deliberately left null. Lets a reviewer see the parser's reasoning (e.g. a bed
// count that couldn't be tied to one of several facilities) and correct it via
// feedback rather than wonder why it's missing.
export interface ExtractionNote {
  field: string;
  value: string | null;
  confidence: number;
  reason: string;
}

export interface ParsedResume {
  personal_info: PersonalInfo | null;
  experience: Experience[];
  education: Education[];
  skills: string[];
  certifications: Certification[];
  projects: Project[];
  languages: string[];
  references?: Reference[];
  awards?: string[];
  publications?: string[];
  professional_associations?: string[];
  clinical_rotations?: ClinicalRotation[];
  compliance?: ComplianceInfo | null;
  extraction_notes?: ExtractionNote[];
}

export interface ConfidenceScores {
  overall: number;
  personal_info: number;
  experience: number;
  education: number;
  skills: number;
}

export interface SkillsValidation {
  total: number;
  recognized_count: number;
  unrecognized_count: number;
  recognized_ratio: number;
  recognized: string[];
  unrecognized: string[];
  groups: Record<string, string>;
}

// "partial" is a terminal success-with-caveats state: parsing degraded (e.g. the
// AI step timed out) so `data` holds only what could be recovered and `warnings`
// explains what needs human review. It is NOT "completed" — never treat it as a
// clean parse.
export type JobStatus = "pending" | "processing" | "completed" | "partial" | "failed";

export interface ParseResponse {
  job_id: string;
  status: JobStatus;
  data: ParsedResume | null;
  confidence: ConfidenceScores | null;
  skills_validation?: SkillsValidation | null;
  poll_url: string | null;
}

export interface JobStatusResponse {
  job_id: string;
  status: JobStatus;
  data: ParsedResume | null;
  confidence: ConfidenceScores | null;
  skills_validation?: SkillsValidation | null;
  // A degraded parse: `data` is present but needs human review.
  partial: boolean;
  warnings: string[];
  error: string | null;
}

export interface RetryResponse extends ParseResponse {
  original_job_id: string;
  retry_count: number;
}

// ── Batch ─────────────────────────────────────────────────────────────────────
export interface BatchSkipped {
  filename: string;
  reason: string;
}
export interface BatchJob {
  job_id: string;
  filename: string;
}
export interface BatchSubmitResponse {
  batch_id: string;
  total: number;
  skipped: number;
  skipped_files: BatchSkipped[];
  // Accepted files paired with their job ID, so a result can be matched back to the
  // file it came from. `job_ids` is the same IDs without the filenames.
  jobs: BatchJob[];
  job_ids: string[];
  status: string;
  poll_url: string;
}
export interface BatchStatusResponse {
  batch_id: string;
  status: string; // processing | completed | partial | failed
  total: number;
  completed: number;
  failed: number;
  processing: number;
  created_at: string;
  completed_at: string | null;
}

// ── Feedback ──────────────────────────────────────────────────────────────────
export interface FeedbackResponse {
  feedback_id: string;
  job_id: string;
  status: string; // accepted
  changed: boolean;
  changed_fields: string[];
  created_at: string;
}

// ── Webhooks ──────────────────────────────────────────────────────────────────
export type WebhookEvent = "parse.completed" | "parse.failed" | "batch.completed";
export const WEBHOOK_EVENTS: WebhookEvent[] = ["parse.completed", "parse.failed", "batch.completed"];
export interface WebhookResponse {
  webhook_id: string;
  url: string;
  events: string[];
  hmac_secret?: string | null;
  status: string; // active | disabled
  created_at: string;
}

// ── Health ────────────────────────────────────────────────────────────────────
export interface HealthResponse {
  status: string; // ok | degraded
  version: string;
  environment: string;
  latency_ms?: number | null;
  dependencies?: Record<string, string> | null;
}

// ── Large-file upload (presigned) ─────────────────────────────────────────────
export interface UploadUrlResponse {
  job_id: string;
  upload_url: string;
  fields: Record<string, string>;
  s3_key: string;
  max_file_size_mb: number;
  expires_in_seconds: number;
  parse_url: string;
}

export interface ApiErrorBody {
  error: { status_code?: number; error_code?: string; detail: string; hint?: string; request_id?: string };
}

export class ApiError extends Error {
  status: number;
  body: ApiErrorBody | string | null;
  constructor(status: number, message: string, body: ApiErrorBody | string | null) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}
