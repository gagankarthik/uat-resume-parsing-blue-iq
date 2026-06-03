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

export interface Experience {
  company: string | null;
  role: string | null;
  start_date: string | null;
  end_date: string | null;
  is_current: boolean | null;
  location: string | null;
  description: string | null;
  achievements: string[];
}

export interface Education {
  institution: string | null;
  degree: string | null;
  field_of_study: string | null;
  start_year: number | null;
  graduation_year: number | null;
  gpa: string | null;
}

export interface Certification {
  name: string | null;
  issuer: string | null;
  issued_date: string | null;
  expiry_date: string | null;
  credential_id: string | null;
}

export interface Project {
  name: string | null;
  description: string | null;
  technologies: string[];
  url: string | null;
}

export interface ParsedResume {
  personal_info: PersonalInfo | null;
  experience: Experience[];
  education: Education[];
  skills: string[];
  certifications: Certification[];
  projects: Project[];
  languages: string[];
}

export interface ConfidenceScores {
  overall: number;
  personal_info: number;
  experience: number;
  education: number;
  skills: number;
}

export type JobStatus = "pending" | "processing" | "completed" | "failed";

export interface ParseResponse {
  job_id: string;
  status: JobStatus;
  data: ParsedResume | null;
  confidence: ConfidenceScores | null;
  poll_url: string | null;
}

export interface JobStatusResponse {
  job_id: string;
  status: JobStatus;
  data: ParsedResume | null;
  confidence: ConfidenceScores | null;
  error: string | null;
}

// ── API-key admin ─────────────────────────────────────────────────────────────

export interface ApiKey {
  key_hash: string;
  key_prefix: string;
  company_id: string;
  status: string; // "active" | "revoked"
  rate_limit_per_minute: number;
  rate_limit_per_day: number;
  created_at: string;
}

export interface CreateApiKeyRequest {
  company_id: string;
  rate_limit_per_minute?: number;
  rate_limit_per_day?: number;
}

// Returned ONCE on creation — includes the raw key, shown to the operator once.
export interface CreateApiKeyResponse extends ApiKey {
  api_key: string;
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
