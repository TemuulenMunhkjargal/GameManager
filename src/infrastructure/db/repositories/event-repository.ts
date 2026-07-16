import { and, asc, eq, inArray, sql } from "drizzle-orm";
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

  private async reservedCounts(eventIds: EventId[]): Promise<Map<EventId, number>> {
    if (eventIds.length === 0) return new Map();
    const rows = await this.db
      .select({ eventId: registrations.eventId, count: sql<number>`count(*)` })
      .from(registrations)
      .where(and(
        inArray(registrations.eventId, eventIds),
        inArray(registrations.status, ["pending_payment", "confirmed", "checked_in"]),
      ))
      .groupBy(registrations.eventId);

    return new Map(rows.map((row) => [row.eventId, Number(row.count)]));
  }

  private async waitlistCounts(eventIds: EventId[]): Promise<Map<EventId, number>> {
    if (eventIds.length === 0) return new Map();
    const rows = await this.db
      .select({ eventId: waitlistEntries.eventId, count: sql<number>`count(*)` })
      .from(waitlistEntries)
      .where(and(inArray(waitlistEntries.eventId, eventIds), eq(waitlistEntries.status, "waiting")))
      .groupBy(waitlistEntries.eventId);

    return new Map(rows.map((row) => [row.eventId, Number(row.count)]));
  }

  private toDomain(row: EventRow, reservedCount: number): Event {
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
      reservedCount,
      row.waitlistEnabled,
      row.entryFeeInCents > 0 ? Money.usd(row.entryFeeInCents) : null,
      row.gameSystemId,
      row.gameSystemLabel,
      row.venueId,
      row.venueName,
      row.roomId,
      row.roomName,
      row.archivedAt,
    );
  }

  private toSummaryDTO(row: EventRow, reservedCount: number, waitlistCount: number): EventSummaryDTO {
    return {
      id: row.id,
      title: row.title,
      gameSystemLabel: row.gameSystemLabel,
      gameSystemId: row.gameSystemId,
      venueName: row.venueName,
      startsAt: row.startsAt.toISOString(),
      endsAt: row.endsAt.toISOString(),
      capacity: row.capacity,
      confirmedCount: reservedCount,
      waitlistCount,
      entryFeeInCents: row.entryFeeInCents,
      status: row.status,
      visibility: row.visibility,
      waitlistEnabled: row.waitlistEnabled,
      archivedAt: row.archivedAt?.toISOString() ?? null,
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

    if (!row) return null;
    const reserved = await this.reservedCounts([row.id]);
    return this.toDomain(row, reserved.get(row.id) ?? 0);
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
      archivedAt: event.archivedAt,
    };

    await this.db
      .insert(events)
      .values(values)
      .onConflictDoUpdate({ target: events.id, set: values });
  }

  public async deleteMany(eventIds: EventId[], organizationId: OrganizationId): Promise<number> {
    if (eventIds.length === 0) return 0;
    const uniqueIds = [...new Set(eventIds)];

    return this.db.transaction((transaction) => {
      let removed = 0;
      for (let offset = 0; offset < uniqueIds.length; offset += 500) {
        removed += transaction
          .delete(events)
          .where(and(eq(events.organizationId, organizationId), inArray(events.id, uniqueIds.slice(offset, offset + 500))))
          .returning({ id: events.id })
          .all()
          .length;
      }
      return removed;
    });
  }

  public async listForOrganization(organizationId: OrganizationId): Promise<EventSummaryDTO[]> {
    const rows = await this.db.select().from(events)
      .where(eq(events.organizationId, organizationId))
      .orderBy(asc(events.startsAt));
    const eventIds = rows.map((row) => row.id);
    const [reserved, waitlisted] = await Promise.all([
      this.reservedCounts(eventIds),
      this.waitlistCounts(eventIds),
    ]);
    return rows.map((row) => this.toSummaryDTO(
      row,
      reserved.get(row.id) ?? 0,
      waitlisted.get(row.id) ?? 0,
    ));
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

    const [reserved, waitlisted] = await Promise.all([
      this.reservedCounts([row.id]),
      this.waitlistCounts([row.id]),
    ]);
    return {
      ...this.toSummaryDTO(row, reserved.get(row.id) ?? 0, waitlisted.get(row.id) ?? 0),
      organizationId: row.organizationId,
      description: row.description,
      venueId: row.venueId,
      roomId: row.roomId,
      roomName: row.roomName,
    };
  }
}
