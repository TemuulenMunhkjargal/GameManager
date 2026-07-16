"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { messageFromRequestError, requestJson } from "@/lib/api-client";

type CancelButtonProps = {
  eventId: string;
  registrationId: string;
  label?: string;
};

export function CancelButton({ eventId, registrationId, label = "Cancel" }: CancelButtonProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function cancel() {
    setIsSubmitting(true);
    setError(null);
    try {
      await requestJson(`/api/events/${eventId}/registrations/${registrationId}/cancel`, { method: "POST" });
      router.refresh();
    } catch (requestError) {
      setError(messageFromRequestError(requestError, "Unable to cancel this registration."));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="inline-line">
      <button className="button danger" disabled={isSubmitting} onClick={cancel} type="button">
        {isSubmitting ? "Cancelling..." : label}
      </button>
      {error ? <span className="error">{error}</span> : null}
    </div>
  );
}
