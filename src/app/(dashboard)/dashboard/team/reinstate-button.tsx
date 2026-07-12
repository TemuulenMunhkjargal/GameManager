"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { UserCheck } from "lucide-react";

type ReinstateButtonProps = {
  membershipId: string;
};

export function ReinstateButton({ membershipId }: ReinstateButtonProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function reinstate() {
    setIsSubmitting(true);
    setError(null);

    const response = await fetch(`/api/team/${membershipId}/reinstate`, { method: "POST" });

    setIsSubmitting(false);

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(body?.error ?? "Unable to reinstate.");
      return;
    }

    router.refresh();
  }

  return (
    <div className="inline-line">
      <button className="button secondary" disabled={isSubmitting} onClick={reinstate} type="button">
        <UserCheck aria-hidden="true" size={16} />
        {isSubmitting ? "Reinstating..." : "Reinstate"}
      </button>
      {error ? <span className="error">{error}</span> : null}
    </div>
  );
}
