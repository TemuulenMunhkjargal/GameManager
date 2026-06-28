import { notFound } from "next/navigation";
import { getEvent } from "@/lib/crit-table-store";
import { formatDateTime, formatMoney } from "@/lib/format";
import { PublicRegistrationForm } from "./public-registration-form";

type PublicEventPageProps = {
  params: Promise<{
    eventId: string;
  }>;
};

export default async function PublicEventPage({ params }: PublicEventPageProps) {
  const { eventId } = await params;
  const event = getEvent(eventId);

  if (!event || event.visibility === "private") {
    notFound();
  }

  const seatsRemaining = Math.max(event.capacity - event.confirmedCount, 0);

  return (
    <main className="public-page">
      <div className="public-container">
        <div className="brand" style={{ color: "#171717" }}>
          <div className="brand-mark">CT</div>
          <div className="brand-title">CritTable</div>
          <div className="brand-subtitle">Mana Vault Games</div>
        </div>

        <section className="public-hero">
          <div>
            <p className="eyebrow">{event.gameSystem}</p>
            <h1 className="page-title">{event.title}</h1>
            <p className="page-copy">{event.description}</p>

            <div className="toolbar" style={{ justifyContent: "flex-start" }}>
              <span className="badge">{formatDateTime(event.startsAt)}</span>
              <span className={seatsRemaining > 0 ? "badge" : "badge warning"}>
                {seatsRemaining > 0 ? `${seatsRemaining} seats left` : "Waitlist open"}
              </span>
              <span className="badge">{formatMoney(event.entryFeeInCents)}</span>
            </div>
          </div>

          <aside className="panel detail-panel">
            <h2>Reserve a seat</h2>
            <p>
              {event.venueName}
              {event.roomName ? `, ${event.roomName}` : ""}
            </p>
            <PublicRegistrationForm eventId={event.id} />
          </aside>
        </section>
      </div>
    </main>
  );
}

