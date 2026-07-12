"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signIn } from "@/lib/auth-client";
import { DiscordSignInButton } from "@/app/discord-sign-in-button";

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(formEvent: React.FormEvent<HTMLFormElement>) {
    formEvent.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const { error: signInError } = await signIn.email({ email, password });

    setIsSubmitting(false);

    if (signInError) {
      setError(signInError.message ?? "Invalid email or password.");
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <main className="public-page">
      <div className="public-container" style={{ maxWidth: 420 }}>
        <div className="brand">
          <div className="brand-mark">CT</div>
          <div className="brand-title">CritTable</div>
          <div className="brand-subtitle">Staff sign in</div>
        </div>

        <form className="panel form-panel" onSubmit={handleSubmit}>
          <h2>Sign in</h2>
          <DiscordSignInButton mode="sign-in" />
          <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "12px 0" }}>
            <hr style={{ flex: 1, border: "none", borderTop: "1px solid var(--line)" }} />
            <span className="muted" style={{ fontSize: 12 }}>or</span>
            <hr style={{ flex: 1, border: "none", borderTop: "1px solid var(--line)" }} />
          </div>
          <div className="form-grid">
            <div className="field full">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                onChange={(changeEvent) => setEmail(changeEvent.target.value)}
                required
                type="email"
                value={email}
              />
            </div>
            <div className="field full">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                onChange={(changeEvent) => setPassword(changeEvent.target.value)}
                required
                type="password"
                value={password}
              />
            </div>
          </div>

          {error ? <p className="notice error">{error}</p> : null}

          <div className="form-actions" style={{ justifyContent: "space-between", alignItems: "center" }}>
            <button className="button" disabled={isSubmitting} type="submit">
              {isSubmitting ? "Signing in..." : "Sign in"}
            </button>
            <Link className="muted" href="/forgot-password">
              Forgot password?
            </Link>
          </div>
        </form>

        <p className="muted" style={{ textAlign: "center", marginTop: 16 }}>
          Have an invite?{" "}
          <Link href="/sign-up">Create an account</Link>
        </p>
      </div>
    </main>
  );
}
