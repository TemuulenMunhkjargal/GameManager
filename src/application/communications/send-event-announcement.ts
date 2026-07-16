import { Announcement } from "../../domain/communications/announcement";
import { failure, success, type Result } from "../../domain/shared/result";
import type { EventId } from "../../domain/events/event";
import type { OrganizationId } from "../../domain/organizations/organization";
import type { EventRepository } from "../events/ports";
import type { AnnouncementDeliveryService } from "./announcement-delivery-service";
import type { AnnouncementRepository } from "./ports";

export type SendEventAnnouncementCommand = {
  organizationId: OrganizationId;
  eventId: EventId;
  subject: string;
  body: string;
  /** If set (and in the future), the announcement is scheduled instead of sent immediately. */
  scheduledFor: Date | null;
};

export class SendEventAnnouncementUseCase {
  public constructor(
    private readonly events: EventRepository,
    private readonly announcements: AnnouncementRepository,
    private readonly delivery: AnnouncementDeliveryService,
    private readonly createId: () => string,
  ) {}

  public async execute(command: SendEventAnnouncementCommand): Promise<Result<Announcement>> {
    const subject = command.subject.trim();
    const body = command.body.trim();

    if (!subject) {
      return failure("Subject is required.");
    }

    if (!body) {
      return failure("Message body is required.");
    }

    const event = await this.events.findByIdForOrganization(command.eventId, command.organizationId);

    if (!event) {
      return failure("Event not found.");
    }

    const draft = new Announcement(
      this.createId(),
      command.organizationId,
      event.id,
      subject,
      body,
      "organization_members",
      "draft",
      null,
      0,
      null,
      true,
    );

    if (command.scheduledFor) {
      const scheduled = draft.schedule(command.scheduledFor);

      if (!scheduled.ok) {
        return scheduled;
      }

      await this.announcements.save(scheduled.value);

      return success(scheduled.value);
    }

    const sent = await this.delivery.deliver(draft);

    if (!sent.ok) {
      return sent;
    }

    await this.announcements.save(sent.value);

    return success(sent.value);
  }
}
