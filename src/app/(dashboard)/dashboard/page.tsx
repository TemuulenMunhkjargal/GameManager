import Link from "next/link";
import { ArrowRight, CalendarPlus } from "lucide-react";
import { container, DEFAULT_ORGANIZATION_ID } from "@/infrastructure/container";
import { formatDateTime, formatMoney } from "@/lib/format";


export const dynamic = "force-dynamic";

export default async function DashboardOverviewPage() {
  const summary = await container.dashboard.getSummary(DEFAULT_ORGANIZATION_ID);
  const allEvents = await container.events.listForOrganization(DEFAULT_ORGANIZATION_ID);
  const events = allEvents.slice(0, 4);
  const gameSystems = (await container.gameSystems.listForOrganization(DEFAULT_ORGANIZATION_ID)).slice(
    0,
    4,
  );

  return (
    <>
      <div className="topbar">
        <div>
          <p className="eyebrow">Overview</p>
          <h1 className="page-title">Store operations</h1>
          <p className="page-copy">
            A quick command center for upcoming events, registrations, check-ins, and the hobby
            systems your store supports.
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
          <p className="stat-label">Active members</p>
          <p className="stat-value">{summary.activeMembers}</p>
        </div>
        <div className="panel stat">
          <p className="stat-label">Estimated entry revenue</p>
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
                    <td>{formatDateTime(event.startsAt)}</td>
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
        </aside>
      </div>
    </>
  );
}

