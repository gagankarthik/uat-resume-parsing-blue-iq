// Client-side settings in localStorage: the target API base URL and the API key
// used for X-API-Key. The API client passes them to the server-side proxy.

export interface UatSettings {
  apiBaseUrl: string;
  apiKey: string;
}

const STORAGE_KEY = "uat-console-settings";

// Prefer the value baked in from .env (NEXT_PUBLIC_API_BASE_URL); fall back to
// the current production Function URL so the console works out of the box.
export const DEFAULT_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.trim() ||
  "https://dqzxwwacosqcxipouyzxnrh7ky0sdnqw.lambda-url.us-east-2.on.aws/";

export function getSettings(): UatSettings {
  if (typeof window === "undefined") {
    return { apiBaseUrl: DEFAULT_BASE_URL, apiKey: "" };
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const p = JSON.parse(raw) as Partial<UatSettings>;
      return { apiBaseUrl: p.apiBaseUrl?.trim() || DEFAULT_BASE_URL, apiKey: p.apiKey ?? "" };
    }
  } catch {
    /* ignore */
  }
  return { apiBaseUrl: DEFAULT_BASE_URL, apiKey: "" };
}

export function saveSettings(s: UatSettings): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  window.dispatchEvent(new Event("uat-settings-changed"));
}
