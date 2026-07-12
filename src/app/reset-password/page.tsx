"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const tokenError = searchParams.get("error");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(formEvent: React.FormEvent<HTMLFormElement>) {
    formEvent.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }

    if (!token) {
      setError("This reset link is missing its token. Request a new one.");
      return;
    }

    setIsSubmitting(true);

    const response = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newPassword: password, token }),
    });

    setIsSubmitting(false);

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { message?: string } | null;
      setError(body?.message ?? "Unable to reset password. The link may have expired.");
      return;
    }

    setDone(true);
    setTimeout(() => router.push("/sign-in"), 1500);
  }

  if (tokenError) {
    return (
      <p className="notice error">
        This reset link is invalid or expired. Go back and request a new one.
      </p>
    );
  }

  if (done) {
    return <p className="notice">Password reset. Redirecting you to sign in...</p>;
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-grid">
        <div className="field full">
          <label htmlFor="password">New password</label>
          <input
            id="password"
            minLength={8}
            onChange={(e) => setPassword(e.target.value)}
            required
            type="password"
            value={password}
          />
        </div>
        <div className="field full">
          <label htmlFor="confirm">Confirm new password</label>
          <input
            id="confirm"
            minLength={8}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            type="password"
            value={confirmPassword}
          />
        </div>
      </div>

      {error ? <p className="notice error">{error}</p> : null}

      <div className="form-actions">
        <button className="button" disabled={isSubmitting} type="submit">
          {isSubmitting ? "Resetting..." : "Reset password"}
        </button>
      </div>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <main className="public-page">
      <div className="public-container" style={{ maxWidth: 420 }}>
        <div className="brand">
          <div className="brand-mark">CT</div>
          <div className="brand-title">CritTable</div>
          <div className="brand-subtitle">Choose a new password</div>
        </div>

        <div className="panel form-panel">
          <h2>Reset password</h2>
          <Suspense fallback={<p className="notice">Loading...</p>}>
            <ResetPasswordForm />
          </Suspense>
        </div>

        <p className="muted" style={{ textAlign: "center", marginTop: 16 }}>
          <Link href="/sign-in">Back to sign in</Link>
        </p>
      </div>
    </main>
  );
}
