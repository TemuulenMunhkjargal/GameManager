"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CheckCircle, XCircle } from "lucide-react";

type EventLifecycleButtonProps = {
  eventId: string;
  action: "publish" | "cancel";
};

export function EventLifecycleButton({ eventId, action }: EventLifecycleButtonProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setIsSubmitting(true);
    setError(null);

    const response = await fetch(`/api/events/${eventId}/${action}`, { method: "POST" });

    setIsSubmitting(false);

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(body?.error ?? "Action failed.");
      return;
    }

    router.refresh();
  }

  return (
    <div className="inline-line">
      <button
        className={action === "publish" ? "button" : "button danger"}
        disabled={isSubmitting}
        onClick={handleClick}
        type="button"
      >
        {action === "publish" ? (
          <CheckCircle aria-hidden="true" size={16} />
        ) : (
          <XCircle aria-hidden="true" size={16} />
        )}
        {isSubmitting
          ? action === "publish"
            ? "Publishing…"
            : "Cancelling…"
          : action === "publish"
            ? "Publish"
            : "Cancel event"}
      </button>
      {error ? <span className="error">{error}</span> : null}
    </div>
  );
}
