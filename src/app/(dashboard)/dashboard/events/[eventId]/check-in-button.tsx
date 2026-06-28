"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type CheckInButtonProps = {
  eventId: string;
  registrationId: string;
};

export function CheckInButton({ eventId, registrationId }: CheckInButtonProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function checkIn() {
    setIsSubmitting(true);

    await fetch(`/api/events/${eventId}/registrations/${registrationId}/check-in`, {
      method: "POST",
    });

    setIsSubmitting(false);
    router.refresh();
  }

  return (
    <button className="button secondary" disabled={isSubmitting} onClick={checkIn} type="button">
      {isSubmitting ? "Checking in..." : "Check in"}
    </button>
  );
}

