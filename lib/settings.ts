// Client-side settings in localStorage:
//  - apiBaseUrl: the resume-parser API base URL (used by the test/proxy)
//  - apiKey:     the X-API-Key used when testing resume parsing
//  - adminPassword: gate for the API-key admin routes (matched server-side)

export interface UatSettings {
  apiBaseUrl: string;
  apiKey: string;
  adminPassword: string;
}

const STORAGE_KEY = "uat-console-settings";

export const DEFAULT_BASE_URL =
  "https://dqzxwwacosqcxipouyzxnrh7ky0sdnqw.lambda-url.us-east-2.on.aws/";

export function getSettings(): UatSettings {
  if (typeof window === "undefined") {
    return { apiBaseUrl: DEFAULT_BASE_URL, apiKey: "", adminPassword: "" };
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const p = JSON.parse(raw) as Partial<UatSettings>;
      return {
        apiBaseUrl: p.apiBaseUrl?.trim() || DEFAULT_BASE_URL,
        apiKey: p.apiKey ?? "",
        adminPassword: p.adminPassword ?? "",
      };
    }
  } catch {
    /* ignore */
  }
  return { apiBaseUrl: DEFAULT_BASE_URL, apiKey: "", adminPassword: "" };
}

export function saveSettings(s: UatSettings): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  window.dispatchEvent(new Event("uat-settings-changed"));
}
