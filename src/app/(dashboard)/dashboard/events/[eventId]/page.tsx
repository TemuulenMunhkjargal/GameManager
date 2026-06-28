import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { getEvent, listRegistrations } from "@/lib/crit-table-store";
import { formatDateTime, formatMoney } from "@/lib/format";
import { CheckInButton } from "./check-in-button";

type EventDetailPageProps = {
  params: Promise<{
    eventId: string;
  }>;
};

export default async function EventDetailPage({ params }: EventDetailPageProps) {
  const { eventId } = await params;
  const event = getEvent(eventId);

  if (!event) {
    notFound();
  }

  const registrations = listRegistrations(eventId);

  return (
    <>
      <div className="topbar">
        <div>
          <p className="eyebrow">{event.gameSystem}</p>
          <h1 className="page-title">{event.title}</h1>
          <p className="page-copy">
            {formatDateTime(event.startsAt)} at {event.venueName}
            {event.roomName ? `, ${event.roomName}` : ""}
          </p>
        </div>
        <div className="form-actions">
          <Link className="button secondary" href="/dashboard/events">
            Back
          </Link>
          <Link className="button" href={`/events/${event.id}`}>
            <ExternalLink aria-hidden="true" size={16} />
            Public page
          </Link>
        </div>
      </div>

      <div className="detail-layout">
        <section className="panel detail-panel">
          <h2>Attendees</h2>
          {registrations.length === 0 ? (
            <p className="notice">No one has registered yet.</p>
          ) : (
            <ul className="attendee-list">
              {registrations.map((registration) => (
                <li className="attendee" key={registration.id}>
                  <div>
                    <strong>{registration.attendeeName}</strong>
                    <div>{registration.attendeeEmail}</div>
                  </div>
                  <div className="form-actions">
                    <span
                      className={
                        registration.status === "waitlisted"
                          ? "badge warning"
                          : registration.status === "checked_in"
                            ? "badge"
                            : "badge"
                      }
                    >
                      {registration.status.replace("_", " ")}
                    </span>
                    {registration.status === "confirmed" ? (
                      <CheckInButton eventId={event.id} registrationId={registration.id} />
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <aside className="panel detail-panel">
          <h3>Event snapshot</h3>
          <p>
            <strong>Status:</strong> {event.status}
          </p>
          <p>
            <strong>Seats:</strong> {event.confirmedCount}/{event.capacity}
          </p>
          <p>
            <strong>Waitlist:</strong> {event.waitlistEnabled ? "Enabled" : "Disabled"}
          </p>
          <p>
            <strong>Entry:</strong> {formatMoney(event.entryFeeInCents)}
          </p>
          <p>
            <strong>Ends:</strong> {formatDateTime(event.endsAt)}
          </p>
          <p>{event.description}</p>
        </aside>
      </div>
    </>
  );
}

