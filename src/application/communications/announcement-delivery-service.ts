import type { Announcement } from "../../domain/communications/announcement";
import { failure, type Result } from "../../domain/shared/result";
import type { EventRepository } from "../events/ports";
import type { RegistrationQueries } from "../registrations/ports";
import type { OrganizationRepository } from "../organizations/ports";
import type { DiscordGateway } from "../shared/discord-gateway";
import type { EmailGateway } from "../shared/email-gateway";

export class AnnouncementDeliveryService {
  public constructor(
    private readonly events: EventRepository,
    private readonly organizations: OrganizationRepository,
    private readonly registrationQueries: RegistrationQueries,
    private readonly email: EmailGateway,
    private readonly discord: DiscordGateway,
  ) {}

  /**
   * Actually sends an announcement's emails (and optional Discord post) and
   * returns the announcement transitioned to "sent". Does not persist —
   * callers are responsible for saving via their AnnouncementRepository.
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

    const allRegistrations = await this.registrationQueries.listForEvent(announcement.eventId);

    const recipients = allRegistrations.filter((registration) => {
      if (announcement.audience === "confirmed_attendees") {
        return registration.status === "confirmed" || registration.status === "checked_in";
      }

      if (announcement.audience === "waitlisted") {
        return registration.status === "waitlisted";
      }

      return (
        registration.status === "confirmed" ||
        registration.status === "checked_in" ||
        registration.status === "waitlisted"
      );
    });

    const recipientEmails = recipients
      .map((r) => ({ email: r.attendeeEmail, name: r.attendeeName }))
      .filter((r): r is { email: string; name: string } => !!r.email);

    let sent = 0;

    for (const recipient of recipientEmails) {
      await this.email.sendEventAnnouncement({
        to: recipient.email,
        recipientName: recipient.name,
        eventTitle: event.title,
        subject: announcement.subject,
        body: announcement.body,
      });

      sent++;
    }

    if (announcement.notifyDiscord) {
      const organization = await this.organizations.findById(announcement.organizationId);

      if (organization?.discordWebhookUrl) {
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
          }),
          capacity: event.capacity,
          entryFeeInCents: event.entryFee?.amountInCents ?? 0,
        });
      }
    }

    return announcement.markSent(sent);
  }
}
