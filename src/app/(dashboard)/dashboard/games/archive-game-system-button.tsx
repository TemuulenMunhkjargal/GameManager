"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type ArchiveGameSystemButtonProps = {
  gameSystemId: string;
  isArchived: boolean;
};

export function ArchiveGameSystemButton({ gameSystemId, isArchived }: ArchiveGameSystemButtonProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle() {
    setIsSubmitting(true);
    setError(null);

    const response = await fetch(
      `/api/game-systems/${gameSystemId}/${isArchived ? "restore" : "archive"}`,
      { method: "POST" },
    );

    setIsSubmitting(false);

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(body?.error ?? "Unable to update.");
      return;
    }

    router.refresh();
  }

  return (
    <div className="inline-line">
      <button
        className={isArchived ? "button secondary" : "button danger"}
        disabled={isSubmitting}
        onClick={toggle}
        type="button"
      >
        {isSubmitting ? "Working…" : isArchived ? "Restore" : "Archive"}
      </button>
      {error ? <span className="error">{error}</span> : null}
    </div>
  );
}
