import type { Announcement } from "../../domain/communications/announcement";
import { failure, type Result } from "../../domain/shared/result";
import type { EventRepository } from "../events/ports";
import type { OrganizationRepository } from "../organizations/ports";
import type { DiscordGateway } from "../shared/discord-gateway";

export class AnnouncementDeliveryService {
  public constructor(
    private readonly events: EventRepository,
    private readonly organizations: OrganizationRepository,
    private readonly discord: DiscordGateway,
  ) {}

  /**
   * Posts an announcement to the configured Discord channel and returns the
   * announcement transitioned to "sent". Callers persist the returned value.
   */
  public async deliver(announcement: Announcement): Promise<Result<Announcement>> {
    if (!announcement.eventId) {
      return failure("Announcement has no associated event.");
    }

    const event = await this.events.findByIdForOrganization(
      announcement.eventId,
      announcement.organizationId,
    );
    if (!event) {
      return failure("Event not found.");
    }

    const organization = await this.organizations.findById(announcement.organizationId);
    if (!organization?.discordWebhookUrl) {
      return failure("Configure a Discord webhook in Settings before sending announcements.");
    }

    try {
      await this.discord.sendEventAnnouncement({
        webhookUrl: organization.discordWebhookUrl,
        organizationName: organization.name,
        eventTitle: event.title,
        gameSystemLabel: event.gameSystemLabel,
        eventDate: event.startsAt.toLocaleDateString("en-US", {
          weekday: "long",
          month: "long",
          day: "numeric",
          year: "numeric",
          hour: "numeric",
          minute: "2-digit",
          timeZone: organization.timezone,
        }),
        capacity: event.capacity,
        entryFeeInCents: event.entryFee?.amountInCents ?? 0,
        headline: announcement.subject,
        description: announcement.body,
      });
    } catch (error) {
      return failure(error instanceof Error ? error.message : "Discord announcement failed.");
    }

    return announcement.markSent(1);
  }
}
