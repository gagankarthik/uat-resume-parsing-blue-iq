"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button, Card, ErrorBanner, Input, Label, Logo } from "@/components/ui";
import { login } from "@/lib/account";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await login(email, password);
      router.push("/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-sm flex-col justify-center py-10">
      <div className="mb-6 flex justify-center">
        <Logo className="h-8 w-auto" />
      </div>
      <Card>
        <div className="mb-5">
          <span className="label-caps text-accent-700">UAT Console</span>
          <h1 className="mt-2 font-display text-2xl font-semibold tracking-tight text-ink">Sign in</h1>
          <p className="mt-1 text-sm text-ink-soft">Access the Resume Parser API testing console.</p>
        </div>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <Label>Email</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoFocus required />
          </div>
          <div>
            <Label>Password</Label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          {error && <ErrorBanner message={error} />}
          <Button type="submit" loading={loading} className="w-full">
            Sign in
          </Button>
        </form>
        <p className="mt-4 text-xs text-ink-soft">
          Internal tool - accounts are managed in the Blue-IQ Cognito pool. Contact an admin for access.
        </p>
      </Card>
    </div>
  );
}
