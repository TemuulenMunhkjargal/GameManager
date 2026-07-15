import { Announcement } from "../../domain/communications/announcement";
import type { AnnouncementAudience } from "../../domain/communications/announcement";
import type { Membership } from "../../domain/organizations/membership";
import { failure, success, type Result } from "../../domain/shared/result";
import type { EventId } from "../../domain/events/event";
import type { OrganizationId } from "../../domain/organizations/organization";
import type { EventRepository } from "../events/ports";
import { requireEventManagement } from "../shared/authorization";
import type { AnnouncementDeliveryService } from "./announcement-delivery-service";
import type { AnnouncementRepository } from "./ports";

export type SendEventAnnouncementCommand = {
  organizationId: OrganizationId;
  actorMembership: Membership | null;
  eventId: EventId;
  subject: string;
  body: string;
  audience: AnnouncementAudience;
  /** Whether to also post to Discord if a webhook is configured. */
  notifyDiscord: boolean;
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
    const authorization = requireEventManagement(command.actorMembership);

    if (!authorization.ok) {
      return authorization;
    }

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
      command.audience,
      "draft",
      null,
      0,
      null,
      command.notifyDiscord,
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
