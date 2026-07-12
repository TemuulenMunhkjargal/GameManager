"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const ROLES = ["owner", "admin", "event_manager", "staff", "viewer"] as const;

type RoleSelectProps = {
  membershipId: string;
  currentRole: (typeof ROLES)[number];
};

export function RoleSelect({ membershipId, currentRole }: RoleSelectProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function changeRole(newRole: string) {
    setIsSubmitting(true);
    setError(null);

    const response = await fetch(`/api/team/${membershipId}/role`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: newRole }),
    });

    setIsSubmitting(false);

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(body?.error ?? "Unable to change role.");
      return;
    }

    router.refresh();
  }

  return (
    <div className="inline-line">
      <select
        defaultValue={currentRole}
        disabled={isSubmitting}
        onChange={(changeEvent) => changeRole(changeEvent.target.value)}
      >
        {ROLES.map((role) => (
          <option key={role} value={role}>
            {role.replace("_", " ")}
          </option>
        ))}
      </select>
      {error ? <span className="error">{error}</span> : null}
    </div>
  );
}
