import Link from "next/link";
import { ArrowRight, CalendarPlus } from "lucide-react";
import { container, DEFAULT_ORGANIZATION_ID } from "@/infrastructure/container";
import { formatDateTime, formatMoney } from "@/lib/format";


export const dynamic = "force-dynamic";

export default async function DashboardOverviewPage() {
  const summary = await container.dashboard.getSummary(DEFAULT_ORGANIZATION_ID);
  const settings = await container.settings.get(DEFAULT_ORGANIZATION_ID);
  const allEvents = await container.events.listForOrganization(DEFAULT_ORGANIZATION_ID);
  const now = new Date();
  const events = allEvents.filter((event) => event.status !== "cancelled" && new Date(event.endsAt) >= now).slice(0, 4);
  const gameSystems = (await container.gameSystems.listForOrganization(DEFAULT_ORGANIZATION_ID)).slice(
    0,
    4,
  );

  return (
    <>
      <div className="topbar">
        <div>
          <p className="eyebrow">Overview</p>
          <h1 className="page-title">Your next game night</h1>
          <p className="page-copy">
            Plan sessions, keep track of players, and see what is coming up without any setup
            ceremony.
          </p>
        </div>
        <Link className="button" href="/dashboard/events/new">
          <CalendarPlus aria-hidden="true" size={18} />
          New event
        </Link>
      </div>

      <section className="grid columns-3" aria-label="Dashboard stats">
        <div className="panel stat">
          <p className="stat-label">Upcoming events</p>
          <p className="stat-value">{summary.upcomingEvents}</p>
        </div>
        <div className="panel stat">
          <p className="stat-label">Players</p>
          <p className="stat-value">{summary.activeMembers}</p>
        </div>
        <div className="panel stat">
          <p className="stat-label">Planned entry fees</p>
          <p className="stat-value">{formatMoney(summary.revenueInCents)}</p>
        </div>
      </section>

      <div className="detail-layout" style={{ marginTop: 18 }}>
        <section className="panel detail-panel">
          <div className="toolbar" style={{ marginTop: 0 }}>
            <h2>Upcoming events</h2>
            <Link className="button secondary" href="/dashboard/events">
              View all
              <ArrowRight aria-hidden="true" size={16} />
            </Link>
          </div>
          {events.length === 0 ? (
            <div className="empty-state">
              <CalendarPlus aria-hidden="true" size={28} />
              <h3>Plan your first game night</h3>
              <p>Pick a game, choose a time and place, then add the people you want at the table.</p>
              <Link className="button" href="/dashboard/events/new">
                Create a game night
              </Link>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
              <thead>
                <tr>
                  <th>Event</th>
                  <th>Start</th>
                  <th>Seats</th>
                </tr>
              </thead>
              <tbody>
                {events.map((event) => (
                  <tr key={event.id}>
                    <td>
                      <Link href={`/dashboard/events/${event.id}`}>
                        <strong>{event.title}</strong>
                      </Link>
                      <div>{event.gameSystemLabel}</div>
                    </td>
                    <td>{formatDateTime(event.startsAt, settings?.timezone)}</td>
                    <td>
                      <span className="badge">
                        {event.confirmedCount}/{event.capacity}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
              </table>
            </div>
          )}
        </section>

        <aside className="panel detail-panel">
          <h3>Game mix</h3>
          <ul className="attendee-list">
            {gameSystems.map((system) => (
              <li className="attendee" key={system.id}>
                <div>
                  <strong>{system.name}</strong>
                  <div>{system.type.replace("_", " ")}</div>
                </div>
                <span className="badge">{system.activeEventCount} active</span>
              </li>
            ))}
          </ul>
          {gameSystems.length === 0 ? (
            <p className="notice">Add a game when you create your first game night.</p>
          ) : null}
        </aside>
      </div>
    </>
  );
}

