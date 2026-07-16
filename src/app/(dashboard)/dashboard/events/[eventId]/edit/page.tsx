export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { container, DEFAULT_ORGANIZATION_ID } from "@/infrastructure/container";
import { EditEventForm } from "../edit-event-form";
import { isEventArchived } from "@/application/events/event-archive";

type EditEventPageProps = {
  params: Promise<{ eventId: string }>;
};

export default async function EditEventPage({ params }: EditEventPageProps) {
  const { eventId } = await params;

  const event = await container.events.getDetail(eventId, DEFAULT_ORGANIZATION_ID);

  if (!event) {
    notFound();
  }

  if (isEventArchived(event) || event.status === "cancelled" || event.status === "completed") {
    redirect(`/dashboard/events/${eventId}`);
  }

  return (
    <>
      <div className="topbar">
        <div>
          <p className="eyebrow">{event.gameSystemLabel}</p>
          <h1 className="page-title">Edit event</h1>
        </div>
        <Link className="button secondary" href={`/dashboard/events/${eventId}`}>
          Cancel
        </Link>
      </div>

      <div className="panel form-panel">
        <EditEventForm event={event} />
      </div>
    </>
  );
}
