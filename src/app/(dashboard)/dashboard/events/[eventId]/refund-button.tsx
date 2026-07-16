"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Undo2 } from "lucide-react";
import { messageFromRequestError, requestJson } from "@/lib/api-client";

type RefundButtonProps = {
  eventId: string;
  registrationId: string;
};

export function RefundButton({ eventId, registrationId }: RefundButtonProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  async function refund() {
    setIsSubmitting(true);
    setError(null);

    try {
      await requestJson(`/api/events/${eventId}/registrations/${registrationId}/refund`, { method: "POST" });
      router.refresh();
    } catch (requestError) {
      setError(messageFromRequestError(requestError, "Unable to process refund."));
    } finally {
      setIsSubmitting(false);
      setConfirming(false);
    }
  }

  if (confirming) {
    return (
      <div className="inline-line">
        <span className="muted">Refund this payment?</span>
        <button className="button danger" disabled={isSubmitting} onClick={refund} type="button">
          {isSubmitting ? "Refunding…" : "Confirm refund"}
        </button>
        <button className="button secondary" disabled={isSubmitting} onClick={() => setConfirming(false)} type="button">
          Cancel
        </button>
      </div>
    );
  }

  return (
    <div className="inline-line">
      <button className="button secondary" onClick={() => setConfirming(true)} type="button">
        <Undo2 aria-hidden="true" size={16} />
        Refund
      </button>
      {error ? <span className="error">{error}</span> : null}
    </div>
  );
}
