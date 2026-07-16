import { and, desc, eq, lte } from "drizzle-orm";
import {
  Announcement,
  type AnnouncementId,
} from "../../../domain/communications/announcement";
import type { EventId } from "../../../domain/events/event";
import type { OrganizationId } from "../../../domain/organizations/organization";
import type {
  AnnouncementQueries,
  AnnouncementRepository,
  AnnouncementSummaryDTO,
} from "../../../application/communications/ports";
import type { Database } from "../client";
import { announcements } from "../schema";
import type { announcements as AnnouncementsTable } from "../schema";

type AnnouncementRow = typeof AnnouncementsTable.$inferSelect;

function toDomain(row: AnnouncementRow): Announcement {
  return new Announcement(
    row.id,
    row.organizationId,
    row.eventId,
    row.subject,
    row.body,
    row.audience,
    row.status,
    row.sentAt,
    row.recipientCount,
    row.scheduledFor,
    row.notifyDiscord,
  );
}

export class DrizzleAnnouncementRepository implements AnnouncementRepository, AnnouncementQueries {
  public constructor(private readonly db: Database) {}

  public async findById(announcementId: AnnouncementId): Promise<Announcement | null> {
    const [row] = await this.db.select().from(announcements).where(eq(announcements.id, announcementId)).limit(1);
    return row ? toDomain(row) : null;
  }

  public async findDueToSend(now: Date): Promise<Announcement[]> {
    const rows = await this.db
      .select()
      .from(announcements)
      .where(and(eq(announcements.status, "scheduled"), lte(announcements.scheduledFor, now)));

    return rows.map(toDomain);
  }

  public async save(announcement: Announcement): Promise<void> {
    const values = {
      id: announcement.id,
      organizationId: announcement.organizationId,
      eventId: announcement.eventId,
      subject: announcement.subject,
      body: announcement.body,
      audience: announcement.audience,
      status: announcement.status,
      recipientCount: announcement.recipientCount,
      sentAt: announcement.sentAt,
      scheduledFor: announcement.scheduledFor,
      notifyDiscord: announcement.notifyDiscord,
    };

    await this.db
      .insert(announcements)
      .values(values)
      .onConflictDoUpdate({ target: announcements.id, set: values });
  }

  public async listForEvent(
    eventId: EventId,
    organizationId: OrganizationId,
  ): Promise<AnnouncementSummaryDTO[]> {
    const rows = await this.db
      .select()
      .from(announcements)
      .where(
        and(eq(announcements.eventId, eventId), eq(announcements.organizationId, organizationId)),
      )
      .orderBy(desc(announcements.createdAt));

    return rows.map((row) => ({
      id: row.id,
      subject: row.subject,
      audience: row.audience,
      status: row.status,
      sentAt: row.sentAt ? row.sentAt.toISOString() : null,
      scheduledFor: row.scheduledFor ? row.scheduledFor.toISOString() : null,
      recipientCount: row.recipientCount,
    }));
  }
}
