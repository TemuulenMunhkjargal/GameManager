"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type PublicRegistrationFormProps = {
  eventId: string;
};

export function PublicRegistrationForm({ eventId }: PublicRegistrationFormProps) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function onSubmit(formData: FormData) {
    setIsSubmitting(true);
    setError(null);
    setMessage(null);

    const response = await fetch(`/api/events/${eventId}/registrations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        attendeeName: String(formData.get("attendeeName") || ""),
        attendeeEmail: String(formData.get("attendeeEmail") || ""),
      }),
    });

    const result = (await response.json()) as {
      outcome?: "confirmed" | "waitlisted";
      registration?: { status: "pending_payment" | "confirmed" | "cancelled" | "checked_in" };
      waitlistEntry?: { position: number };
      error?: string;
    };

    setIsSubmitting(false);

    if (!response.ok || !result.outcome) {
      setError(result.error ?? "Unable to register.");
      return;
    }

    if (result.outcome === "waitlisted") {
      setMessage(
        `You're on the waitlist at position #${result.waitlistEntry?.position ?? "?"}. We'll reach out if a seat opens up.`,
      );
    } else if (result.registration?.status === "pending_payment") {
      setMessage("You're on the list! Pay your entry fee at the door to confirm your seat.");
    } else {
      setMessage("You are registered. See you at the table.");
    }

    router.refresh();
  }

  return (
    <form action={onSubmit}>
      <div className="grid">
        <div className="field">
          <label htmlFor="attendeeName">Name</label>
          <input id="attendeeName" name="attendeeName" required />
        </div>
        <div className="field">
          <label htmlFor="attendeeEmail">Email</label>
          <input id="attendeeEmail" name="attendeeEmail" required type="email" />
        </div>
      </div>
      {message ? <p className="success">{message}</p> : null}
      {error ? <p className="error">{error}</p> : null}
      <div className="form-actions">
        <button className="button" disabled={isSubmitting} type="submit">
          {isSubmitting ? "Reserving..." : "Reserve seat"}
        </button>
      </div>
    </form>
  );
}

