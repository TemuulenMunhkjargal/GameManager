import { and, eq, ne } from "drizzle-orm";
import { Registration, type RegistrationId } from "../../../domain/registrations/registration";
import type { EventId } from "../../../domain/events/event";
import type { MemberProfileId } from "../../../domain/members/member-profile";
import type {
  RegistrationQueries,
  RegistrationRepository,
  RegistrationSummaryDTO,
} from "../../../application/registrations/ports";
import type { Database } from "../client";
import { memberProfiles, payments, registrations, waitlistEntries } from "../schema";
import type { registrations as RegistrationsTable } from "../schema";

type RegistrationRow = typeof RegistrationsTable.$inferSelect;

function toDomain(row: RegistrationRow): Registration {
  return new Registration(row.id, row.eventId, row.memberProfileId, row.status, row.registeredAt, row.checkedInAt);
}

export class DrizzleRegistrationRepository implements RegistrationRepository, RegistrationQueries {
  public constructor(private readonly db: Database) {}

  public async findActiveForEventMember(
    eventId: EventId,
    memberProfileId: MemberProfileId,
  ): Promise<Registration | null> {
    const [row] = await this.db
      .select()
      .from(registrations)
      .where(
        and(
          eq(registrations.eventId, eventId),
          eq(registrations.memberProfileId, memberProfileId),
          ne(registrations.status, "cancelled"),
        ),
      )
      .limit(1);

    return row ? toDomain(row) : null;
  }

  public async findById(registrationId: RegistrationId, eventId: EventId): Promise<Registration | null> {
    const [row] = await this.db
      .select()
      .from(registrations)
      .where(and(eq(registrations.id, registrationId), eq(registrations.eventId, eventId)))
      .limit(1);

    return row ? toDomain(row) : null;
  }

  public async save(registration: Registration): Promise<void> {
    const values = {
      id: registration.id,
      eventId: registration.eventId,
      memberProfileId: registration.memberProfileId,
      status: registration.status,
      registeredAt: registration.registeredAt,
      checkedInAt: registration.checkedInAt,
    };

    await this.db
      .insert(registrations)
      .values(values)
      .onConflictDoUpdate({ target: registrations.id, set: values });
  }

  public async listForEvent(eventId: EventId): Promise<RegistrationSummaryDTO[]> {
    const registrationRows = await this.db
      .select({
        id: registrations.id,
        eventId: registrations.eventId,
        status: registrations.status,
        registeredAt: registrations.registeredAt,
        checkedInAt: registrations.checkedInAt,
        attendeeName: memberProfiles.displayName,
        attendeeEmail: memberProfiles.email,
        paymentStatus: payments.status,
      })
      .from(registrations)
      .innerJoin(memberProfiles, eq(memberProfiles.id, registrations.memberProfileId))
      .leftJoin(payments, eq(payments.registrationId, registrations.id))
      .where(eq(registrations.eventId, eventId));

    const waitlistRows = await this.db
      .select({
        id: waitlistEntries.id,
        eventId: waitlistEntries.eventId,
        position: waitlistEntries.position,
        joinedAt: waitlistEntries.joinedAt,
        attendeeName: memberProfiles.displayName,
        attendeeEmail: memberProfiles.email,
      })
      .from(waitlistEntries)
      .innerJoin(memberProfiles, eq(memberProfiles.id, waitlistEntries.memberProfileId))
      .where(and(eq(waitlistEntries.eventId, eventId), eq(waitlistEntries.status, "waiting")));

    const summaries: RegistrationSummaryDTO[] = [
      ...registrationRows.map((row) => ({
        id: row.id,
        eventId: row.eventId,
        attendeeName: row.attendeeName,
        attendeeEmail: row.attendeeEmail,
        status: row.status,
        registeredAt: row.registeredAt.toISOString(),
        checkedInAt: row.checkedInAt ? row.checkedInAt.toISOString() : null,
        waitlistPosition: null,
        paymentStatus: row.paymentStatus,
      })),
      ...waitlistRows.map((row) => ({
        id: row.id,
        eventId: row.eventId,
        attendeeName: row.attendeeName,
        attendeeEmail: row.attendeeEmail,
        status: "waitlisted",
        registeredAt: row.joinedAt.toISOString(),
        checkedInAt: null,
        waitlistPosition: row.position,
        paymentStatus: null,
      })),
    ];

    return summaries.sort((first, second) => first.registeredAt.localeCompare(second.registeredAt));
  }
}
