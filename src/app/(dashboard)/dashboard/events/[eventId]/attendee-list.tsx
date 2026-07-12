"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CheckCheck } from "lucide-react";
import type { RegistrationSummaryDTO } from "@/application/registrations/ports";
import { CheckInButton } from "./check-in-button";
import { CancelButton } from "./cancel-button";
import { MarkPaidButton } from "./mark-paid-button";
import { RefundButton } from "./refund-button";

type AttendeeListProps = {
  eventId: string;
  registrations: RegistrationSummaryDTO[];
  canManageBilling: boolean;
};

export function AttendeeList({ eventId, registrations, canManageBilling }: AttendeeListProps) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectableIds = registrations
    .filter((r) => r.status === "confirmed")
    .map((r) => r.id);

  const allSelected = selectableIds.length > 0 && selectableIds.every((id) => selected.has(id));

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(selectableIds));
  }

  async function bulkCheckIn() {
    setIsSubmitting(true);
    setError(null);

    const response = await fetch(`/api/events/${eventId}/bulk-check-in`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ registrationIds: Array.from(selected) }),
    });

    setIsSubmitting(false);

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(body?.error ?? "Unable to check in selected attendees.");
      return;
    }

    setSelected(new Set());
    router.refresh();
  }

  if (registrations.length === 0) {
    return <p className="notice">No one has registered yet.</p>;
  }

  return (
    <>
      {selectableIds.length > 0 ? (
        <div className="inline-line" style={{ marginBottom: 12 }}>
          <label className="inline-line">
            <input checked={allSelected} onChange={toggleAll} type="checkbox" />
            Select all confirmed
          </label>
          {selected.size > 0 ? (
            <button className="button secondary" disabled={isSubmitting} onClick={bulkCheckIn} type="button">
              <CheckCheck aria-hidden="true" size={16} />
              {isSubmitting ? "Checking in…" : `Check in ${selected.size} selected`}
            </button>
          ) : null}
          {error ? <span className="error">{error}</span> : null}
        </div>
      ) : null}

      <ul className="attendee-list">
        {registrations.map((registration) => (
          <li className="attendee" key={registration.id}>
            <div className="inline-line">
              {registration.status === "confirmed" ? (
                <input
                  checked={selected.has(registration.id)}
                  onChange={() => toggle(registration.id)}
                  type="checkbox"
                />
              ) : null}
              <div>
                <strong>{registration.attendeeName}</strong>
                <div>{registration.attendeeEmail}</div>
              </div>
            </div>
            <div className="form-actions">
              <span
                className={
                  registration.status === "waitlisted"
                    ? "badge warning"
                    : registration.status === "pending_payment"
                      ? "badge danger"
                      : "badge"
                }
              >
                {registration.status === "waitlisted" && registration.waitlistPosition
                  ? `waitlist #${registration.waitlistPosition}`
                  : registration.status.replace("_", " ")}
              </span>
              {registration.paymentStatus === "refunded" ? (
                <span className="badge warning">refunded</span>
              ) : null}
              {registration.status === "pending_payment" ? (
                <MarkPaidButton eventId={eventId} registrationId={registration.id} />
              ) : null}
              {canManageBilling && registration.paymentStatus === "paid" ? (
                <RefundButton eventId={eventId} registrationId={registration.id} />
              ) : null}
              {registration.status === "confirmed" ? (
                <CheckInButton eventId={eventId} registrationId={registration.id} />
              ) : null}
              {registration.status === "confirmed" ||
              registration.status === "waitlisted" ||
              registration.status === "pending_payment" ? (
                <CancelButton
                  eventId={eventId}
                  registrationId={registration.id}
                  label={registration.status === "waitlisted" ? "Leave waitlist" : "Cancel"}
                />
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
