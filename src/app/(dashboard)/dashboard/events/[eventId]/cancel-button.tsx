"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type CancelButtonProps = {
  eventId: string;
  registrationId: string;
  label?: string;
};

export function CancelButton({ eventId, registrationId, label = "Cancel" }: CancelButtonProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function cancel() {
    setIsSubmitting(true);

    await fetch(`/api/events/${eventId}/registrations/${registrationId}/cancel`, {
      method: "POST",
    });

    setIsSubmitting(false);
    router.refresh();
  }

  return (
    <button className="button danger" disabled={isSubmitting} onClick={cancel} type="button">
      {isSubmitting ? "Cancelling..." : label}
    </button>
  );
}
