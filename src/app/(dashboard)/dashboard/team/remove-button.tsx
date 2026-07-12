"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { UserMinus } from "lucide-react";

type RemoveTeammateButtonProps = {
  membershipId: string;
  label?: string;
};

export function RemoveTeammateButton({ membershipId, label = "Remove" }: RemoveTeammateButtonProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function remove() {
    setIsSubmitting(true);
    setError(null);

    const response = await fetch(`/api/team/${membershipId}/remove`, { method: "POST" });

    setIsSubmitting(false);

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(body?.error ?? "Unable to remove.");
      return;
    }

    router.refresh();
  }

  return (
    <div className="inline-line">
      <button className="button danger" disabled={isSubmitting} onClick={remove} type="button">
        <UserMinus aria-hidden="true" size={16} />
        {isSubmitting ? "Removing..." : label}
      </button>
      {error ? <span className="error">{error}</span> : null}
    </div>
  );
}
