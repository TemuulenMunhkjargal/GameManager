import type { EventSummaryDTO } from "@/application/events/ports";

export const ARCHIVED_EVENT_LIMIT = 100;
export const ARCHIVED_EVENT_PAGE_SIZE = 10;

export function splitArchivedEvents(events: EventSummaryDTO[], now = new Date()) {
  const past = events.filter((event) => new Date(event.endsAt).getTime() < now.getTime())
    .sort((a, b) => new Date(b.endsAt).getTime() - new Date(a.endsAt).getTime());
  return { retained: past.slice(0, ARCHIVED_EVENT_LIMIT), expired: past.slice(ARCHIVED_EVENT_LIMIT) };
}
