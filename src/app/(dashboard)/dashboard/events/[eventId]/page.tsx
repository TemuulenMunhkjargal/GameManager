import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink, Pencil, Download } from "lucide-react";
import { container, DEFAULT_ORGANIZATION_ID, resolveActor } from "@/infrastructure/container";
import { formatDateTime, formatMoney } from "@/lib/format";
import { AttendeeList } from "./attendee-list";
import { EventLifecycleButton } from "./event-lifecycle-button";
import { AnnouncementForm } from "./announcement-form";

type EventDetailPageProps = {
  params: Promise<{ eventId: string }>;
};

export default async function EventDetailPage({ params }: EventDetailPageProps) {
  const { eventId } = await params;

  const [event, registrations, actor, settings, announcementList] = await Promise.all([
    container.events.getDetail(eventId, DEFAULT_ORGANIZATION_ID),
    container.registrations.listForEvent(eventId),
    resolveActor(DEFAULT_ORGANIZATION_ID),
    container.settings.get(DEFAULT_ORGANIZATION_ID),
    container.announcements.listForEvent(eventId, DEFAULT_ORGANIZATION_ID),
  ]);

  if (!event) {
    notFound();
  }

  const canManage = actor?.membership?.canManageEvents() ?? false;
  const canManageBilling = actor?.membership?.canManageBilling() ?? false;
  const hasDiscordWebhook = !!settings?.discordWebhookUrl;

  return (
    <>
      <div className="topbar">
        <div>
          <p className="eyebrow">{event.gameSystemLabel}</p>
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
          {canManage && event.status !== "cancelled" && event.status !== "completed" ? (
            <Link className="button secondary" href={`/dashboard/events/${event.id}/edit`}>
              <Pencil aria-hidden="true" size={16} />
              Edit
            </Link>
          ) : null}
          {canManage && event.status === "draft" ? (
            <EventLifecycleButton action="publish" eventId={event.id} />
          ) : null}
          {canManage && event.status === "published" ? (
            <EventLifecycleButton action="cancel" eventId={event.id} />
          ) : null}
          {event.status !== "cancelled" ? (
            <Link className="button" href={`/events/${event.id}`}>
              <ExternalLink aria-hidden="true" size={16} />
              Public page
            </Link>
          ) : null}
        </div>
      </div>

      {event.status === "cancelled" ? (
        <p className="notice error">This event has been cancelled. Registrations are closed.</p>
      ) : event.status === "draft" ? (
        <p className="notice">
          This event is a <strong>draft</strong> — it is not visible publicly and cannot accept
          registrations until published.
        </p>
      ) : null}

      <div className="detail-layout">
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <section className="panel detail-panel">
            <div className="topbar" style={{ marginBottom: 8 }}>
              <h2 style={{ margin: 0 }}>Attendees</h2>
              {registrations.length > 0 ? (
                <a className="button secondary" href={`/api/events/${event.id}/attendees.csv`}>
                  <Download aria-hidden="true" size={16} />
                  Export CSV
                </a>
              ) : null}
            </div>
            <AttendeeList
              canManageBilling={canManageBilling}
              eventId={event.id}
              registrations={registrations}
            />
          </section>

          {canManage && event.status === "published" && registrations.length > 0 ? (
            <section className="panel detail-panel">
              <h2>Send announcement</h2>
              <p className="muted" style={{ marginBottom: 16 }}>
                Email all or a subset of attendees. Posts to Discord too if a webhook is
                configured.
              </p>
              <AnnouncementForm eventId={event.id} hasDiscordWebhook={hasDiscordWebhook} />

              {announcementList.length > 0 ? (
                <>
                  <hr style={{ margin: "20px 0", border: "none", borderTop: "1px solid var(--line)" }} />
                  <h3 style={{ marginBottom: 12 }}>Announcements</h3>
                  <ul className="attendee-list">
                    {announcementList.map((ann) => (
                      <li className="attendee" key={ann.id}>
                        <div>
                          <strong>{ann.subject}</strong>
                          <div className="muted">
                            {ann.audience.replace("_", " ")}
                            {ann.status === "scheduled" && ann.scheduledFor
                              ? ` · sends ${formatDateTime(ann.scheduledFor)}`
                              : null}
                          </div>
                        </div>
                        <div className="form-actions">
                          <span
                            className={
                              ann.status === "scheduled"
                                ? "badge warning"
                                : ann.status === "failed"
                                  ? "badge danger"
                                  : "badge"
                            }
                          >
                            {ann.status}
                          </span>
                          {ann.status === "sent" ? (
                            <span className="muted">{ann.recipientCount} sent</span>
                          ) : null}
                        </div>
                      </li>
                    ))}
                  </ul>
                </>
              ) : null}
            </section>
          ) : null}
        </div>

        <aside className="panel detail-panel">
          <h3>Event snapshot</h3>
          <p>
            <strong>Status:</strong>{" "}
            <span
              className={
                event.status === "cancelled"
                  ? "badge danger"
                  : event.status === "draft"
                    ? "badge warning"
                    : "badge"
              }
            >
              {event.status}
            </span>
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
