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
  // Structured facility location (Edit Work History form)
  city?: string | null;
  state?: string | null;
  country?: string | null;
  zip_code?: string | null;
  employer_phone?: string | null;
  // Clinical classification
  profession?: string | null;
  specialties?: string[];
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
  reason_for_leaving?: string | null;
  description: string[]; // one item per responsibility/bullet
  achievements: string[];
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

export type JobStatus = "pending" | "processing" | "completed" | "failed";

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
  error: string | null;
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
