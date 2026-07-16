"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Banknote } from "lucide-react";
import { messageFromRequestError, requestJson } from "@/lib/api-client";

type MarkPaidButtonProps = {
  eventId: string;
  registrationId: string;
};

export function MarkPaidButton({ eventId, registrationId }: MarkPaidButtonProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function markPaid() {
    setIsSubmitting(true);
    setError(null);

    try {
      await requestJson(`/api/events/${eventId}/registrations/${registrationId}/mark-paid`, { method: "POST" });
      router.refresh();
    } catch (requestError) {
      setError(messageFromRequestError(requestError, "Unable to record payment."));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="inline-line">
      <button className="button secondary" disabled={isSubmitting} onClick={markPaid} type="button">
        <Banknote aria-hidden="true" size={16} />
        {isSubmitting ? "Recording..." : "Mark paid"}
      </button>
      {error ? <span className="error">{error}</span> : null}
    </div>
  );
}
