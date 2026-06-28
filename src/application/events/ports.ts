import type { Event, EventId } from "../../domain/events/event";
import type { OrganizationId } from "../../domain/organizations/organization";

export interface EventRepository {
  findByIdForOrganization(eventId: EventId, organizationId: OrganizationId): Promise<Event | null>;
  save(event: Event): Promise<void>;
}

