"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "@/lib/auth-client";

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

          <div className="form-actions">
            <button className="button" disabled={isSubmitting} type="submit">
              {isSubmitting ? "Signing in..." : "Sign in"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
