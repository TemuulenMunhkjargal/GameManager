"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { UserPlus } from "lucide-react";

const INVITABLE_ROLES = ["admin", "event_manager", "staff", "viewer"] as const;

export function InviteTeammateForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<(typeof INVITABLE_ROLES)[number]>("staff");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(formEvent: React.FormEvent<HTMLFormElement>) {
    formEvent.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const response = await fetch("/api/team/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, role }),
    });

    setIsSubmitting(false);

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(body?.error ?? "Unable to send invitation.");
      return;
    }

    setEmail("");
    router.refresh();
  }

  return (
    <form className="form-grid" onSubmit={handleSubmit}>
      <div className="field">
        <label htmlFor="invite-email">Email</label>
        <input
          id="invite-email"
          onChange={(changeEvent) => setEmail(changeEvent.target.value)}
          required
          type="email"
          value={email}
        />
      </div>
      <div className="field">
        <label htmlFor="invite-role">Role</label>
        <select
          id="invite-role"
          onChange={(changeEvent) => setRole(changeEvent.target.value as typeof role)}
          value={role}
        >
          {INVITABLE_ROLES.map((roleOption) => (
            <option key={roleOption} value={roleOption}>
              {roleOption.replace("_", " ")}
            </option>
          ))}
        </select>
      </div>
      {error ? <p className="notice error full">{error}</p> : null}
      <div className="form-actions full">
        <button className="button" disabled={isSubmitting} type="submit">
          <UserPlus aria-hidden="true" size={16} />
          {isSubmitting ? "Sending..." : "Send invite"}
        </button>
      </div>
    </form>
  );
}
