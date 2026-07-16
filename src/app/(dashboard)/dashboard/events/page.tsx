import Link from "next/link";
import { Archive, CalendarPlus } from "lucide-react";
import { container, DEFAULT_ORGANIZATION_ID } from "@/infrastructure/container";
import { formatDateTime, formatMoney } from "@/lib/format";
import { ScheduleCalendar } from "../schedule-calendar";
import { ScheduleViewToggle } from "../schedule-view-toggle";
import { isEventArchived } from "@/application/events/event-archive";


export const dynamic = "force-dynamic";

export default async function EventsPage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const [events, settings] = await Promise.all([container.events.listForOrganization(DEFAULT_ORGANIZATION_ID), container.settings.get(DEFAULT_ORGANIZATION_ID)]);
  const view = (await searchParams).view === "calendar" ? "calendar" : "list";
  const currentEvents = events.filter((event) => !isEventArchived(event));
  const publishedEvents = currentEvents.filter((event) => event.status === "published");
  const totalRegistrations = currentEvents.reduce((total, event) => total + event.confirmedCount, 0);
  const totalCapacity = currentEvents.reduce((total, event) => total + event.capacity, 0);

  return (
    <>
      <div className="topbar">
        <div>
          <p className="eyebrow">Game nights</p>
          <h1 className="page-title">Events</h1>
          <p className="page-copy">
            Plan a night, invite players, track available seats, and keep everything in one place.
          </p>
        </div>
        <div className="form-actions"><Link className="button secondary" href="/dashboard/events/archive"><Archive aria-hidden="true" size={17} />Archived Events</Link><Link className="button" href="/dashboard/events/new"><CalendarPlus aria-hidden="true" size={18} />New event</Link></div>
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
        <h2>Event schedule</h2>
        <ScheduleViewToggle view={view} />
      </div>
      {view === "calendar" ? <ScheduleCalendar emptyCopy="Create an event to place it on your calendar." items={currentEvents.map((event) => ({ id: event.id, title: event.title, start: event.startsAt, end: event.endsAt, href: `/dashboard/events/${event.id}`, label: event.gameSystemLabel }))} /> : <div className="panel table-wrap">
        <table>
          <thead>
            <tr>
              <th>Event</th>
              <th>Game</th>
              <th>Start</th>
              <th>Seats</th>
              <th>Entry</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {currentEvents.length === 0 ? (
              <tr>
                <td colSpan={6}>
                  <div className="empty-state compact">
                    <CalendarPlus aria-hidden="true" size={26} />
                    <h3>No game nights planned yet</h3>
                    <p>Create one now and GameHall will keep the schedule, players, and seats together.</p>
                    <Link className="button" href="/dashboard/events/new">
                      Plan your first night
                    </Link>
                  </div>
                </td>
              </tr>
            ) : currentEvents.map((event) => (
              <tr key={event.id}>
                <td>
                  <Link href={`/dashboard/events/${event.id}`}>
                    <strong>{event.title}</strong>
                  </Link>
                </td>
                <td>{event.gameSystemLabel}</td>
                <td>{formatDateTime(event.startsAt, settings?.timezone)}</td>
                <td>
                  <span className={event.confirmedCount >= event.capacity ? "badge danger" : "badge"}>
                    {event.confirmedCount}/{event.capacity}
                  </span>
                </td>
                <td>{formatMoney(event.entryFeeInCents)}</td>
                <td><span className={event.status === "cancelled" ? "badge danger" : event.status === "draft" ? "badge warning" : "badge"}>{event.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>}
    </>
  );
}
