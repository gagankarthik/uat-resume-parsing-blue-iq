"use client";

import { useCallback, useEffect, useState } from "react";

import { Badge, Button, Card, ErrorBanner, Input, Label, SectionTitle, Spinner } from "@/components/ui";
import { createKey, deleteKey, listKeys, revokeKey } from "@/lib/api";
import { ApiError, type ApiKey, type CreateApiKeyResponse } from "@/lib/types";

function errMsg(e: unknown): string {
  if (e instanceof ApiError) return e.message;
  if (e instanceof Error) return e.message;
  return "Unexpected error";
}

export default function KeysPage() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Create form
  const [companyId, setCompanyId] = useState("");
  const [rpm, setRpm] = useState("30");
  const [rpd, setRpd] = useState("1000");
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState<CreateApiKeyResponse | null>(null);
  const [copied, setCopied] = useState(false);

  const [busyHash, setBusyHash] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setKeys(await listKeys());
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!companyId.trim()) return;
    setCreating(true);
    setError("");
    setCreated(null);
    try {
      const res = await createKey({
        company_id: companyId.trim(),
        rate_limit_per_minute: Number(rpm) || 30,
        rate_limit_per_day: Number(rpd) || 1000,
      });
      setCreated(res);
      setCompanyId("");
      await load();
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setCreating(false);
    }
  }

  async function onRevoke(hash: string) {
    if (!window.confirm("Revoke this key? It will stop working immediately.")) return;
    setBusyHash(hash);
    try {
      await revokeKey(hash);
      await load();
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setBusyHash(null);
    }
  }

  async function onDelete(hash: string) {
    if (!window.confirm("Permanently delete this key record? This cannot be undone.")) return;
    setBusyHash(hash);
    try {
      await deleteKey(hash);
      await load();
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setBusyHash(null);
    }
  }

  async function copyKey() {
    if (!created) return;
    await navigator.clipboard.writeText(created.api_key);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">API Key Management</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Issue keys per client company and set rate limits. Only a SHA-256 hash is stored — the raw
          key is shown once, here, at creation.
        </p>
      </div>

      {error && <ErrorBanner message={error} />}

      {/* One-time raw-key callout */}
      {created && (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 p-5 dark:border-amber-800 dark:bg-amber-950/30">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="font-semibold text-amber-800 dark:text-amber-300">
              New key for “{created.company_id}” — copy it now
            </h3>
            <button
              onClick={() => setCreated(null)}
              className="text-sm text-amber-700 hover:underline dark:text-amber-400"
            >
              Dismiss
            </button>
          </div>
          <p className="mb-3 text-sm text-amber-700 dark:text-amber-400">
            This is the only time the full key is shown. Store it securely and hand it to the client.
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 overflow-x-auto rounded-lg bg-white px-3 py-2 font-mono text-sm text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100">
              {created.api_key}
            </code>
            <Button variant="secondary" onClick={copyKey} type="button">
              {copied ? "Copied ✓" : "Copy"}
            </Button>
          </div>
        </div>
      )}

      {/* Create form */}
      <Card>
        <SectionTitle hint="Defaults: 30 req/min, 1000 req/day. Adjust per client SLA.">Issue a new key</SectionTitle>
        <form onSubmit={onCreate} className="grid gap-4 sm:grid-cols-[2fr_1fr_1fr_auto] sm:items-end">
          <div>
            <Label>Company ID</Label>
            <Input value={companyId} placeholder="acme-corp" onChange={(e) => setCompanyId(e.target.value)} required />
          </div>
          <div>
            <Label>Req / minute</Label>
            <Input type="number" min={1} value={rpm} onChange={(e) => setRpm(e.target.value)} />
          </div>
          <div>
            <Label>Req / day</Label>
            <Input type="number" min={1} value={rpd} onChange={(e) => setRpd(e.target.value)} />
          </div>
          <Button type="submit" loading={creating} disabled={!companyId.trim()}>
            Create key
          </Button>
        </form>
      </Card>

      {/* List */}
      <Card>
        <div className="mb-4 flex items-center justify-between">
          <SectionTitle>Existing keys</SectionTitle>
          <Button variant="ghost" onClick={load} type="button">
            Refresh
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-zinc-500">
            <Spinner /> Loading…
          </div>
        ) : keys.length === 0 ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">No API keys yet. Issue one above.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                <tr className="border-b border-zinc-200 dark:border-zinc-800">
                  <th className="py-2 pr-4 font-medium">Key</th>
                  <th className="py-2 pr-4 font-medium">Company</th>
                  <th className="py-2 pr-4 font-medium">Status</th>
                  <th className="py-2 pr-4 font-medium">Limits (min / day)</th>
                  <th className="py-2 pr-4 font-medium">Created</th>
                  <th className="py-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {keys.map((k) => (
                  <tr key={k.key_hash} className="border-b border-zinc-100 dark:border-zinc-800/60">
                    <td className="py-2.5 pr-4 font-mono text-zinc-800 dark:text-zinc-200">{k.key_prefix}</td>
                    <td className="py-2.5 pr-4">{k.company_id}</td>
                    <td className="py-2.5 pr-4">
                      <Badge tone={k.status === "active" ? "success" : "danger"}>{k.status}</Badge>
                    </td>
                    <td className="py-2.5 pr-4 text-zinc-600 dark:text-zinc-400">
                      {k.rate_limit_per_minute} / {k.rate_limit_per_day}
                    </td>
                    <td className="py-2.5 pr-4 text-zinc-600 dark:text-zinc-400">
                      {k.created_at ? new Date(k.created_at).toLocaleString() : "—"}
                    </td>
                    <td className="py-2.5">
                      <div className="flex gap-2">
                        {k.status === "active" && (
                          <Button
                            variant="secondary"
                            loading={busyHash === k.key_hash}
                            onClick={() => onRevoke(k.key_hash)}
                            type="button"
                          >
                            Revoke
                          </Button>
                        )}
                        <Button
                          variant="danger"
                          loading={busyHash === k.key_hash}
                          onClick={() => onDelete(k.key_hash)}
                          type="button"
                        >
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
