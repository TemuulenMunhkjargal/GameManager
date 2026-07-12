import { Entity } from "../shared/entity";
import { failure, success, type Result } from "../shared/result";
import type { OrganizationId } from "../organizations/organization";
import type { EventId } from "../events/event";

export type AnnouncementId = string;

export type AnnouncementAudience =
  | "confirmed_attendees"
  | "waitlisted"
  | "all_attendees"
  | "organization_members";

export type AnnouncementStatus = "draft" | "scheduled" | "sent" | "failed";

export class Announcement extends Entity<AnnouncementId> {
  public constructor(
    id: AnnouncementId,
    public readonly organizationId: OrganizationId,
    public readonly eventId: EventId | null,
    public readonly subject: string,
    public readonly body: string,
    public readonly audience: AnnouncementAudience,
    public readonly status: AnnouncementStatus,
    public readonly sentAt: Date | null,
    public readonly recipientCount: number,
    public readonly scheduledFor: Date | null = null,
    public readonly notifyDiscord: boolean = false,
  ) {
    super(id);
  }

  /** Schedule a draft announcement to be sent at a future time. */
  public schedule(scheduledFor: Date, now = new Date()): Result<Announcement> {
    if (this.status !== "draft") {
      return failure("Only draft announcements can be scheduled.");
    }

    if (scheduledFor <= now) {
      return failure("Scheduled time must be in the future.");
    }

    return success(
      new Announcement(
        this.id,
        this.organizationId,
        this.eventId,
        this.subject,
        this.body,
        this.audience,
        "scheduled",
        this.sentAt,
        this.recipientCount,
        scheduledFor,
        this.notifyDiscord,
      ),
    );
  }

  public markSent(recipientCount: number, now = new Date()): Result<Announcement> {
    if (this.status === "sent") {
      return failure("Announcement has already been sent.");
    }

    if (this.status === "failed") {
      return failure("Failed announcements can't be marked sent directly.");
    }

    return success(
      new Announcement(
        this.id,
        this.organizationId,
        this.eventId,
        this.subject,
        this.body,
        this.audience,
        "sent",
        now,
        recipientCount,
        this.scheduledFor,
        this.notifyDiscord,
      ),
    );
  }

  public markFailed(): Result<Announcement> {
    if (this.status === "sent") {
      return failure("Sent announcements can't be marked failed.");
    }

    return success(
      new Announcement(
        this.id,
        this.organizationId,
        this.eventId,
        this.subject,
        this.body,
        this.audience,
        "failed",
        null,
        0,
        this.scheduledFor,
        this.notifyDiscord,
      ),
    );
  }
}
