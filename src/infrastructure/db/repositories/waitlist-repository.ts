import { and, asc, eq } from "drizzle-orm";
import { WaitlistEntry, type WaitlistEntryId } from "../../../domain/registrations/waitlist-entry";
import type { EventId } from "../../../domain/events/event";
import type { MemberProfileId } from "../../../domain/members/member-profile";
import type { WaitlistRepository } from "../../../application/registrations/ports";
import type { Database } from "../client";
import { waitlistEntries } from "../schema";
import type { waitlistEntries as WaitlistTable } from "../schema";

type WaitlistRow = typeof WaitlistTable.$inferSelect;

function toDomain(row: WaitlistRow): WaitlistEntry {
  return new WaitlistEntry(row.id, row.eventId, row.memberProfileId, row.position, row.status, row.joinedAt);
}

export class DrizzleWaitlistRepository implements WaitlistRepository {
  public constructor(private readonly db: Database) {}

  public async findById(waitlistEntryId: WaitlistEntryId, eventId: EventId): Promise<WaitlistEntry | null> {
    const [row] = await this.db
      .select()
      .from(waitlistEntries)
      .where(and(eq(waitlistEntries.id, waitlistEntryId), eq(waitlistEntries.eventId, eventId)))
      .limit(1);

    return row ? toDomain(row) : null;
  }

  public async findActiveForEventMember(
    eventId: EventId,
    memberProfileId: MemberProfileId,
  ): Promise<WaitlistEntry | null> {
    const [row] = await this.db
      .select()
      .from(waitlistEntries)
      .where(
        and(
          eq(waitlistEntries.eventId, eventId),
          eq(waitlistEntries.memberProfileId, memberProfileId),
          eq(waitlistEntries.status, "waiting"),
        ),
      )
      .limit(1);

    return row ? toDomain(row) : null;
  }

  public async findNextWaiting(eventId: EventId): Promise<WaitlistEntry | null> {
    const [row] = await this.db
      .select()
      .from(waitlistEntries)
      .where(and(eq(waitlistEntries.eventId, eventId), eq(waitlistEntries.status, "waiting")))
      .orderBy(asc(waitlistEntries.position))
      .limit(1);

    return row ? toDomain(row) : null;
  }

  public async countActiveForEvent(eventId: EventId): Promise<number> {
    const rows = await this.db
      .select({ id: waitlistEntries.id })
      .from(waitlistEntries)
      .where(and(eq(waitlistEntries.eventId, eventId), eq(waitlistEntries.status, "waiting")));

    return rows.length;
  }

  public async save(entry: WaitlistEntry): Promise<void> {
    const values = {
      id: entry.id,
      eventId: entry.eventId,
      memberProfileId: entry.memberProfileId,
      position: entry.position,
      status: entry.status,
      joinedAt: entry.joinedAt,
    };

    await this.db
      .insert(waitlistEntries)
      .values(values)
      .onConflictDoUpdate({ target: waitlistEntries.id, set: values });
  }
}
