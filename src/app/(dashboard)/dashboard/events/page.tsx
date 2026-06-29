import Link from "next/link";
import { CalendarPlus, ExternalLink } from "lucide-react";
import { container, DEFAULT_ORGANIZATION_ID } from "@/infrastructure/container";
import { formatDateTime, formatMoney } from "@/lib/format";


export const dynamic = "force-dynamic";

export default async function EventsPage() {
  const events = await container.events.listForOrganization(DEFAULT_ORGANIZATION_ID);
  const publishedEvents = events.filter((event) => event.status === "published");
  const totalRegistrations = events.reduce((total, event) => total + event.confirmedCount, 0);
  const totalCapacity = events.reduce((total, event) => total + event.capacity, 0);

  return (
    <>
      <div className="topbar">
        <div>
          <p className="eyebrow">Mana Vault Games</p>
          <h1 className="page-title">Events</h1>
          <p className="page-copy">
            Create store events, publish signup pages, track capacity, and check people in from one
            desktop-first workspace.
          </p>
        </div>
        <Link className="button" href="/dashboard/events/new">
          <CalendarPlus aria-hidden="true" size={18} />
          New event
        </Link>
      </div>

      <section className="grid columns-3" aria-label="Event stats">
        <div className="panel stat">
          <p className="stat-label">Published events</p>
          <p className="stat-value">{publishedEvents.length}</p>
        </div>
        <div className="panel stat">
          <p className="stat-label">Confirmed seats</p>
          <p className="stat-value">{totalRegistrations}</p>
        </div>
        <div className="panel stat">
          <p className="stat-label">Total capacity</p>
          <p className="stat-value">{totalCapacity}</p>
        </div>
      </section>

      <div className="toolbar">
        <h2>Upcoming schedule</h2>
      </div>

      <div className="panel table-wrap">
        <table>
          <thead>
            <tr>
              <th>Event</th>
              <th>Game</th>
              <th>Start</th>
              <th>Seats</th>
              <th>Entry</th>
              <th>Public page</th>
            </tr>
          </thead>
          <tbody>
            {events.map((event) => (
              <tr key={event.id}>
                <td>
                  <Link href={`/dashboard/events/${event.id}`}>
                    <strong>{event.title}</strong>
                  </Link>
                  <div>{event.venueName}</div>
                </td>
                <td>{event.gameSystemLabel}</td>
                <td>{formatDateTime(event.startsAt)}</td>
                <td>
                  <span className={event.confirmedCount >= event.capacity ? "badge danger" : "badge"}>
                    {event.confirmedCount}/{event.capacity}
                  </span>
                </td>
                <td>{formatMoney(event.entryFeeInCents)}</td>
                <td>
                  <Link className="button secondary" href={`/events/${event.id}`}>
                    <ExternalLink aria-hidden="true" size={16} />
                    Open
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
