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
      registration?: { status: string };
      error?: string;
    };

    setIsSubmitting(false);

    if (!response.ok || !result.registration) {
      setError(result.error ?? "Unable to register.");
      return;
    }

    setMessage(
      result.registration.status === "waitlisted"
        ? "You are on the waitlist."
        : "You are registered. See you at the table.",
    );
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

