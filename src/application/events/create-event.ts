import { Event } from "../../domain/events/event";
import type { Membership } from "../../domain/organizations/membership";
import { Money } from "../../domain/shared/money";
import { failure, success, type Result } from "../../domain/shared/result";
import type { OrganizationId } from "../../domain/organizations/organization";
import { requireEventManagement } from "../shared/authorization";
import type { DiscordGateway } from "../shared/discord-gateway";
import type { OrganizationRepository } from "../organizations/ports";
import type { EventRepository } from "./ports";
import type { GameSystemId } from "../../domain/game-systems/game-system";

export type CreateEventCommand = { organizationId: OrganizationId; actorMembership: Membership | null; title: string;
  description: string; gameSystemLabel: string; startsAt: Date; endsAt: Date; capacity: number;
  gameSystemId: GameSystemId | null; entryFeeInCents: number; waitlistEnabled: boolean; publishImmediately?: boolean };

export class CreateEventUseCase {
  public constructor(private readonly events: EventRepository, private readonly organizations: OrganizationRepository,
    private readonly discord: DiscordGateway, private readonly createId: () => string) {}

  public async execute(command: CreateEventCommand): Promise<Result<Event>> {
    const authorization = requireEventManagement(command.actorMembership); if (!authorization.ok) return authorization;
    const title = command.title.trim(); if (!title) return failure("Event title is required.");
    if (Number.isNaN(command.startsAt.getTime()) || Number.isNaN(command.endsAt.getTime())) return failure("Event start and end times are required.");
    let event: Event;
    try {
      event = new Event(this.createId(), command.organizationId, title, command.description.trim(),
        command.publishImmediately === false ? "draft" : "published", "private", command.startsAt, command.endsAt,
        command.capacity, 0, command.waitlistEnabled, command.entryFeeInCents > 0 ? Money.usd(command.entryFeeInCents) : null,
        command.gameSystemId, command.gameSystemLabel.trim() || "Custom game", null, "Local game night", null, null);
    } catch (error) { return failure(error instanceof Error ? error.message : "Unable to create event."); }
    await this.events.save(event);
    const organization = await this.organizations.findById(command.organizationId);
    if (command.publishImmediately !== false && organization?.discordWebhookUrl) {
      const eventDate = event.startsAt.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric",
        year: "numeric", hour: "numeric", minute: "2-digit", timeZone: organization.timezone });
      await this.discord.sendEventAnnouncement({ webhookUrl: organization.discordWebhookUrl, organizationName: organization.name,
        eventTitle: event.title, gameSystemLabel: event.gameSystemLabel, eventDate, capacity: event.capacity,
        entryFeeInCents: event.entryFee?.amountInCents ?? 0 });
    }
    return success(event);
  }
}
