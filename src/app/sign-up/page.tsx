"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signUp } from "@/lib/auth-client";
import { DiscordSignInButton } from "@/app/discord-sign-in-button";

export default function SignUpPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(formEvent: React.FormEvent<HTMLFormElement>) {
    formEvent.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const { error: signUpError } = await signUp.email({ name, email, password });

    setIsSubmitting(false);

    if (signUpError) {
      setError(signUpError.message ?? "Unable to create account.");
      return;
    }

    // Better Auth auto-signs in after signup; if there's a pending invite for
    // this email, the databaseHooks in auth.ts will have linked it already.
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <main className="public-page">
      <div className="public-container" style={{ maxWidth: 420 }}>
        <div className="brand">
          <div className="brand-mark">CT</div>
          <div className="brand-title">CritTable</div>
          <div className="brand-subtitle">Create a staff account</div>
        </div>

        <form className="panel form-panel" onSubmit={handleSubmit}>
          <h2>Sign up</h2>
          <DiscordSignInButton mode="sign-up" />
          <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "12px 0" }}>
            <hr style={{ flex: 1, border: "none", borderTop: "1px solid var(--line)" }} />
            <span className="muted" style={{ fontSize: 12 }}>or</span>
            <hr style={{ flex: 1, border: "none", borderTop: "1px solid var(--line)" }} />
          </div>
          <div className="form-grid">
            <div className="field full">
              <label htmlFor="name">Display name</label>
              <input
                id="name"
                minLength={2}
                onChange={(e) => setName(e.target.value)}
                required
                type="text"
                value={name}
              />
            </div>
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
            <div className="field full">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                minLength={8}
                onChange={(e) => setPassword(e.target.value)}
                required
                type="password"
                value={password}
              />
            </div>
          </div>

          {error ? <p className="notice error">{error}</p> : null}

          <div className="form-actions">
            <button className="button" disabled={isSubmitting} type="submit">
              {isSubmitting ? "Creating account..." : "Create account"}
            </button>
          </div>
        </form>

        <p className="muted" style={{ textAlign: "center", marginTop: 16 }}>
          Already have an account?{" "}
          <Link href="/sign-in">Sign in</Link>
        </p>
      </div>
    </main>
  );
}
