"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button, Card, ErrorBanner, Input, Label, Logo } from "@/components/ui";
import { login, type LoginResult } from "@/lib/account";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // When an invited account signs in with its temporary password, Cognito requires a
  // new password before it will issue a token. We hold the challenge here and switch
  // the form to the "set a new password" step.
  const [challenge, setChallenge] = useState<Extract<LoginResult, { status: "NEW_PASSWORD_REQUIRED" }> | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  function goToApp() {
    router.push("/");
    router.refresh();
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const result = await login(email, password);
      if (result.status === "NEW_PASSWORD_REQUIRED") {
        setChallenge(result);
      } else {
        goToApp();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed");
    } finally {
      setLoading(false);
    }
  }

  async function onSetNewPassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (!challenge) return;
    setLoading(true);
    setError("");
    try {
      await challenge.setNewPassword(newPassword);
      goToApp();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not set the new password");
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
        {challenge ? (
          <>
            <div className="mb-5">
              <span className="label-caps text-accent-700">UAT Console</span>
              <h1 className="mt-2 font-display text-2xl font-semibold tracking-tight text-ink">Set a new password</h1>
              <p className="mt-1 text-sm text-ink-soft">
                Your account was created with a temporary password. Choose a new one to finish signing in.
              </p>
            </div>
            <form onSubmit={onSetNewPassword} className="space-y-4">
              <div>
                <Label>New password</Label>
                <Input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  autoComplete="new-password"
                  autoFocus
                  required
                />
              </div>
              <div>
                <Label>Confirm new password</Label>
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                />
              </div>
              {error && <ErrorBanner message={error} />}
              <Button type="submit" loading={loading} className="w-full">
                Set password and sign in
              </Button>
            </form>
          </>
        ) : (
          <>
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
          </>
        )}
      </Card>
    </div>
  );
}
