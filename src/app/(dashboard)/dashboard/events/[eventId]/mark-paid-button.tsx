"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Banknote } from "lucide-react";

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

    const response = await fetch(
      `/api/events/${eventId}/registrations/${registrationId}/mark-paid`,
      { method: "POST" },
    );

    setIsSubmitting(false);

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(body?.error ?? "Unable to record payment.");
      return;
    }

    router.refresh();
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
