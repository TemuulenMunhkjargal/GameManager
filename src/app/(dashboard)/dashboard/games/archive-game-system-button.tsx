"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { messageFromRequestError, requestJson } from "@/lib/api-client";

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

    try {
      await requestJson(`/api/game-systems/${gameSystemId}/${isArchived ? "restore" : "archive"}`, {
        method: "POST",
      });
      router.refresh();
    } catch (requestError) {
      setError(messageFromRequestError(requestError, "Unable to update."));
    } finally {
      setIsSubmitting(false);
    }
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
