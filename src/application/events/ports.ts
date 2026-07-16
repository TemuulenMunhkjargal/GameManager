import type { Event, EventId, EventStatus, EventVisibility } from "../../domain/events/event";
import type { OrganizationId } from "../../domain/organizations/organization";

export interface EventRepository {
  findByIdForOrganization(eventId: EventId, organizationId: OrganizationId): Promise<Event | null>;
  save(event: Event): Promise<void>;
  deleteMany(eventIds: EventId[], organizationId: OrganizationId): Promise<number>;
}

/**
 * Read-side DTOs. These exist so views never have to reconstruct or depend on
 * domain entities/business rules — they call a query, which is still part of
 * the application layer, just optimized for display rather than enforcing
 * invariants.
 */
export type EventSummaryDTO = {
  id: EventId;
  title: string;
  gameSystemLabel: string;
  gameSystemId: string | null;
  venueName: string;
  startsAt: string;
  endsAt: string;
  capacity: number;
  confirmedCount: number;
  waitlistCount: number;
  entryFeeInCents: number;
  status: EventStatus;
  visibility: EventVisibility;
  waitlistEnabled: boolean;
  archivedAt: string | null;
};

export type EventDetailDTO = EventSummaryDTO & {
  organizationId: OrganizationId;
  description: string;
  venueId: string | null;
  roomId: string | null;
  roomName: string | null;
};

export interface EventQueries {
  listForOrganization(organizationId: OrganizationId): Promise<EventSummaryDTO[]>;
  getDetail(eventId: EventId, organizationId: OrganizationId): Promise<EventDetailDTO | null>;
}
