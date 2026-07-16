"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { messageFromRequestError, requestJson } from "@/lib/api-client";

type CheckInButtonProps = {
  eventId: string;
  registrationId: string;
};

export function CheckInButton({ eventId, registrationId }: CheckInButtonProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function checkIn() {
    setIsSubmitting(true);
    setError(null);
    try {
      await requestJson(`/api/events/${eventId}/registrations/${registrationId}/check-in`, { method: "POST" });
      router.refresh();
    } catch (requestError) {
      setError(messageFromRequestError(requestError, "Unable to check in this player."));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="inline-line">
      <button className="button secondary" disabled={isSubmitting} onClick={checkIn} type="button">
        {isSubmitting ? "Checking in..." : "Check in"}
      </button>
      {error ? <span className="error">{error}</span> : null}
    </div>
  );
}

