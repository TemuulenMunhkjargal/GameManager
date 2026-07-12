"use client";

import { useState } from "react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(formEvent: React.FormEvent<HTMLFormElement>) {
    formEvent.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const response = await fetch("/api/auth/request-password-reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        redirectTo: `${window.location.origin}/reset-password`,
      }),
    });

    setIsSubmitting(false);

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { message?: string } | null;
      setError(body?.message ?? "Unable to send reset email.");
      return;
    }

    setSent(true);
  }

  return (
    <main className="public-page">
      <div className="public-container" style={{ maxWidth: 420 }}>
        <div className="brand">
          <div className="brand-mark">CT</div>
          <div className="brand-title">CritTable</div>
          <div className="brand-subtitle">Reset your password</div>
        </div>

        <div className="panel form-panel">
          <h2>Forgot password</h2>

          {sent ? (
            <p className="notice">
              If that email has an account, we've sent a link to reset the password. Check your
              inbox.
            </p>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="form-grid">
                <div className="field full">
                  <label htmlFor="email">Email</label>
                  <input
                    id="email"
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    type="email"
                    value={email}
                  />
                </div>
              </div>

              {error ? <p className="notice error">{error}</p> : null}

              <div className="form-actions">
                <button className="button" disabled={isSubmitting} type="submit">
                  {isSubmitting ? "Sending..." : "Send reset link"}
                </button>
              </div>
            </form>
          )}
        </div>

        <p className="muted" style={{ textAlign: "center", marginTop: 16 }}>
          <Link href="/sign-in">Back to sign in</Link>
        </p>
      </div>
    </main>
  );
}
