"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CheckCircle, XCircle } from "lucide-react";
import { messageFromRequestError, requestJson } from "@/lib/api-client";

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

    try {
      await requestJson(`/api/events/${eventId}/${action}`, { method: "POST" });
      router.refresh();
    } catch (requestError) {
      setError(messageFromRequestError(requestError, "Action failed."));
    } finally {
      setIsSubmitting(false);
    }
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
