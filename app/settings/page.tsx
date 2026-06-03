"use client";

import { useEffect, useState } from "react";

import { Button, Card, ErrorBanner, Input, Label, SectionTitle } from "@/components/ui";
import { DEFAULT_BASE_URL, getSettings, saveSettings } from "@/lib/settings";

export default function SettingsPage() {
  const [apiBaseUrl, setApiBaseUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const s = getSettings();
    setApiBaseUrl(s.apiBaseUrl);
    setApiKey(s.apiKey);
    setAdminPassword(s.adminPassword);
  }, []);

  function onSave() {
    saveSettings({
      apiBaseUrl: apiBaseUrl.trim() || DEFAULT_BASE_URL,
      apiKey: apiKey.trim(),
      adminPassword,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Stored only in this browser&apos;s localStorage. The API key is used for resume testing;
          the admin password gates API-key management.
        </p>
      </div>

      <Card>
        <SectionTitle hint="The resume-parser API the test console talks to.">Connection</SectionTitle>
        <div className="space-y-4">
          <div>
            <Label>API Base URL</Label>
            <Input
              type="url"
              value={apiBaseUrl}
              placeholder={DEFAULT_BASE_URL}
              onChange={(e) => setApiBaseUrl(e.target.value)}
            />
          </div>

          <div>
            <Label>API Key (for testing the parser)</Label>
            <div className="flex gap-2">
              <Input
                type={showKey ? "text" : "password"}
                value={apiKey}
                placeholder="rp_live_..."
                onChange={(e) => setApiKey(e.target.value)}
              />
              <Button variant="secondary" onClick={() => setShowKey((v) => !v)} type="button">
                {showKey ? "Hide" : "Show"}
              </Button>
            </div>
          </div>

          <div>
            <Label>Admin Password (for API-key management)</Label>
            <div className="flex gap-2">
              <Input
                type={showAdmin ? "text" : "password"}
                value={adminPassword}
                placeholder="matches ADMIN_PASSWORD on the server"
                onChange={(e) => setAdminPassword(e.target.value)}
              />
              <Button variant="secondary" onClick={() => setShowAdmin((v) => !v)} type="button">
                {showAdmin ? "Hide" : "Show"}
              </Button>
            </div>
            <p className="mt-1.5 text-xs text-zinc-500 dark:text-zinc-400">
              Only needed if the server sets <code>ADMIN_PASSWORD</code>. Leave blank for local use.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button onClick={onSave}>Save settings</Button>
            {saved && <span className="text-sm font-medium text-green-600 dark:text-green-400">Saved ✓</span>}
          </div>
        </div>
      </Card>

      <Card>
        <SectionTitle>Server configuration (read-only)</SectionTitle>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          API-key management reads/writes DynamoDB directly from the Next.js server. Configure these
          environment variables where you run this app (see <code>.env.local.example</code>):
        </p>
        <ul className="mt-3 space-y-1 text-sm text-zinc-700 dark:text-zinc-300">
          <li>
            <code>AWS_REGION</code>, <code>AWS_ACCESS_KEY_ID</code>, <code>AWS_SECRET_ACCESS_KEY</code> — AWS access
          </li>
          <li>
            <code>DYNAMODB_TABLE_API_KEYS</code> — defaults to <code>resume-parser-api-keys</code>
          </li>
          <li>
            <code>ADMIN_PASSWORD</code> — optional gate for the admin routes
          </li>
        </ul>
      </Card>

      {!apiBaseUrl && <ErrorBanner message="Set an API base URL to use the test console." />}
    </div>
  );
}
