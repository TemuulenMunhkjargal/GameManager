import type { Announcement, AnnouncementId } from "../../domain/communications/announcement";
import type { EventId } from "../../domain/events/event";
import type { OrganizationId } from "../../domain/organizations/organization";

export interface AnnouncementRepository {
  findById(announcementId: AnnouncementId): Promise<Announcement | null>;
  /** All announcements with status "scheduled" whose scheduledFor is at or before `now`. */
  findDueToSend(now: Date): Promise<Announcement[]>;
  save(announcement: Announcement): Promise<void>;
}

export type AnnouncementSummaryDTO = {
  id: AnnouncementId;
  subject: string;
  audience: string;
  status: string;
  sentAt: string | null;
  scheduledFor: string | null;
  recipientCount: number;
};

export interface AnnouncementQueries {
  listForEvent(eventId: EventId, organizationId: OrganizationId): Promise<AnnouncementSummaryDTO[]>;
}
