import Link from "next/link";
import { container, DEFAULT_ORGANIZATION_ID } from "@/infrastructure/container";
import { ArchivedEventsTable } from "./archived-events-table";
import { ARCHIVED_EVENT_PAGE_SIZE, splitArchivedEvents } from "@/application/events/event-archive";

export const dynamic = "force-dynamic";
export default async function ArchivedEventsPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const allEvents = await container.events.listForOrganization(DEFAULT_ORGANIZATION_ID);
  const { retained } = splitArchivedEvents(allEvents);
  const pages = Math.max(1, Math.ceil(retained.length / ARCHIVED_EVENT_PAGE_SIZE));
  const requestedPage = Number((await searchParams).page ?? 1);
  const page = Number.isInteger(requestedPage) ? Math.min(Math.max(1, requestedPage), pages) : 1;
  const events = retained.slice((page - 1) * ARCHIVED_EVENT_PAGE_SIZE, page * ARCHIVED_EVENT_PAGE_SIZE);

  return <><div className="topbar"><div><p className="eyebrow">History</p><h1 className="page-title">Archived Events</h1><p className="page-copy">Past events and events you archive are kept here. GameHall stores the newest 100; automatic maintenance permanently removes older entries after the limit is exceeded.</p></div><Link className="button secondary" href="/dashboard/events">Back to events</Link></div><ArchivedEventsTable events={events} page={page} pages={pages} total={retained.length} /></>;
}
