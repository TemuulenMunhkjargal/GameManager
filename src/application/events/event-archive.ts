import type { OrganizationId } from "../../domain/organizations/organization";
import { failure, type Result } from "../../domain/shared/result";
import type { Event } from "../../domain/events/event";
import type { EventQueries, EventRepository, EventSummaryDTO } from "./ports";

export const ARCHIVED_EVENT_LIMIT = 100;
export const ARCHIVED_EVENT_PAGE_SIZE = 10;

function archivedTime(event: EventSummaryDTO): number | null {
  if (event.archivedAt) return new Date(event.archivedAt).getTime();
  return new Date(event.endsAt).getTime();
}

export function isEventArchived(event: EventSummaryDTO, now = new Date()): boolean {
  return event.archivedAt !== null || new Date(event.endsAt).getTime() < now.getTime();
}

export function splitArchivedEvents(events: EventSummaryDTO[], now = new Date()) {
  const archived = events
    .filter((event) => isEventArchived(event, now))
    .sort((a, b) => (archivedTime(b) ?? 0) - (archivedTime(a) ?? 0));

  return {
    retained: archived.slice(0, ARCHIVED_EVENT_LIMIT),
    expired: archived.slice(ARCHIVED_EVENT_LIMIT),
  };
}

export type ArchiveEventCommand = {
  organizationId: OrganizationId;
  eventId: string;
  now?: Date;
};

export class ArchiveEventUseCase {
  public constructor(private readonly events: EventRepository) {}

  public async execute(command: ArchiveEventCommand): Promise<Result<Event>> {
    const event = await this.events.findByIdForOrganization(command.eventId, command.organizationId);
    if (!event) return failure("Event not found.");

    const archived = event.archive(command.now);
    if (!archived.ok) return archived;

    await this.events.save(archived.value);
    return archived;
  }
}

export class MaintainEventArchiveUseCase {
  public constructor(
    private readonly eventQueries: EventQueries,
    private readonly events: EventRepository,
  ) {}

  public async execute(input: { organizationId: OrganizationId; now?: Date }): Promise<{ purged: number }> {
    const allEvents = await this.eventQueries.listForOrganization(input.organizationId);
    const { expired } = splitArchivedEvents(allEvents, input.now);
    const purged = await this.events.deleteMany(expired.map((event) => event.id), input.organizationId);
    return { purged };
  }
}
