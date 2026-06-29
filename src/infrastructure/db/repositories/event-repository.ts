import { and, eq, inArray } from "drizzle-orm";
import { Event, type EventId } from "../../../domain/events/event";
import { Money } from "../../../domain/shared/money";
import type { OrganizationId } from "../../../domain/organizations/organization";
import type {
  EventDetailDTO,
  EventQueries,
  EventRepository,
  EventSummaryDTO,
} from "../../../application/events/ports";
import type { Database } from "../client";
import { events, registrations, waitlistEntries } from "../schema";
import type { events as EventsTable } from "../schema";

type EventRow = typeof EventsTable.$inferSelect;

export class DrizzleEventRepository implements EventRepository, EventQueries {
  public constructor(private readonly db: Database) {}

  private async confirmedCount(eventId: EventId): Promise<number> {
    const rows = await this.db
      .select({ id: registrations.id })
      .from(registrations)
      .where(and(eq(registrations.eventId, eventId), inArray(registrations.status, ["confirmed", "checked_in"])));

    return rows.length;
  }

  private async waitlistCount(eventId: EventId): Promise<number> {
    const rows = await this.db
      .select({ id: waitlistEntries.id })
      .from(waitlistEntries)
      .where(and(eq(waitlistEntries.eventId, eventId), eq(waitlistEntries.status, "waiting")));

    return rows.length;
  }

  private async toDomain(row: EventRow): Promise<Event> {
    return new Event(
      row.id,
      row.organizationId,
      row.title,
      row.description,
      row.status,
      row.visibility,
      row.startsAt,
      row.endsAt,
      row.capacity,
      await this.confirmedCount(row.id),
      row.waitlistEnabled,
      row.entryFeeInCents > 0 ? Money.usd(row.entryFeeInCents) : null,
      row.gameSystemId,
      row.gameSystemLabel,
      row.venueId,
      row.venueName,
      row.roomId,
      row.roomName,
    );
  }

  private async toSummaryDTO(row: EventRow): Promise<EventSummaryDTO> {
    return {
      id: row.id,
      title: row.title,
      gameSystemLabel: row.gameSystemLabel,
      venueName: row.venueName,
      startsAt: row.startsAt.toISOString(),
      endsAt: row.endsAt.toISOString(),
      capacity: row.capacity,
      confirmedCount: await this.confirmedCount(row.id),
      waitlistCount: await this.waitlistCount(row.id),
      entryFeeInCents: row.entryFeeInCents,
      status: row.status,
      visibility: row.visibility,
      waitlistEnabled: row.waitlistEnabled,
    };
  }

  public async findByIdForOrganization(
    eventId: EventId,
    organizationId: OrganizationId,
  ): Promise<Event | null> {
    const [row] = await this.db
      .select()
      .from(events)
      .where(and(eq(events.id, eventId), eq(events.organizationId, organizationId)))
      .limit(1);

    return row ? this.toDomain(row) : null;
  }

  public async save(event: Event): Promise<void> {
    const values = {
      id: event.id,
      organizationId: event.organizationId,
      title: event.title,
      description: event.description,
      status: event.status,
      visibility: event.visibility,
      startsAt: event.startsAt,
      endsAt: event.endsAt,
      capacity: event.capacity,
      waitlistEnabled: event.waitlistEnabled,
      entryFeeInCents: event.entryFee?.amountInCents ?? 0,
      gameSystemId: event.gameSystemId,
      gameSystemLabel: event.gameSystemLabel,
      venueId: event.venueId,
      venueName: event.venueName,
      roomId: event.roomId,
      roomName: event.roomName,
    };

    await this.db
      .insert(events)
      .values(values)
      .onConflictDoUpdate({ target: events.id, set: values });
  }

  public async listForOrganization(organizationId: OrganizationId): Promise<EventSummaryDTO[]> {
    const rows = await this.db.select().from(events).where(eq(events.organizationId, organizationId));
    const sorted = [...rows].sort((first, second) => first.startsAt.getTime() - second.startsAt.getTime());

    return Promise.all(sorted.map((row) => this.toSummaryDTO(row)));
  }

  public async getDetail(
    eventId: EventId,
    organizationId: OrganizationId,
  ): Promise<EventDetailDTO | null> {
    const [row] = await this.db
      .select()
      .from(events)
      .where(and(eq(events.id, eventId), eq(events.organizationId, organizationId)))
      .limit(1);

    if (!row) {
      return null;
    }

    return {
      ...(await this.toSummaryDTO(row)),
      organizationId: row.organizationId,
      description: row.description,
      roomName: row.roomName,
    };
  }
}
