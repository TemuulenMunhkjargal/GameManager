import { Event } from "../../domain/events/event";
import type { Membership } from "../../domain/organizations/membership";
import { Money } from "../../domain/shared/money";
import { failure, success, type Result } from "../../domain/shared/result";
import type { OrganizationId } from "../../domain/organizations/organization";
import { requireEventManagement } from "../shared/authorization";
import type { DiscordGateway } from "../shared/discord-gateway";
import type { OrganizationRepository } from "../organizations/ports";
import type { VenueRepository, RoomRepository } from "../venues/ports";
import type { EventRepository } from "./ports";

export type CreateEventCommand = {
  organizationId: OrganizationId;
  actorMembership: Membership | null;
  title: string;
  description: string;
  gameSystemLabel: string;
  /** If set, the venue's real name/id are used and venueName is ignored. */
  venueId: string | null;
  venueName: string;
  /** If set (requires venueId), the room's real name/id are used and roomName is ignored. */
  roomId: string | null;
  roomName: string | null;
  startsAt: Date;
  endsAt: Date;
  capacity: number;
  entryFeeInCents: number;
  waitlistEnabled: boolean;
  /** Defaults to true (publish immediately). Set to false to save as a draft. */
  publishImmediately?: boolean;
  appBaseUrl: string;
};

export class CreateEventUseCase {
  public constructor(
    private readonly events: EventRepository,
    private readonly organizations: OrganizationRepository,
    private readonly venues: VenueRepository,
    private readonly rooms: RoomRepository,
    private readonly discord: DiscordGateway,
    private readonly createId: () => string,
  ) {}

  public async execute(command: CreateEventCommand): Promise<Result<Event>> {
    const authorization = requireEventManagement(command.actorMembership);

    if (!authorization.ok) {
      return authorization;
    }

    const title = command.title.trim();

    if (!title) {
      return failure("Event title is required.");
    }

    if (Number.isNaN(command.startsAt.getTime()) || Number.isNaN(command.endsAt.getTime())) {
      return failure("Event start and end times are required.");
    }

    // Resolve a real Venue/Room when IDs are provided, so the event
    // genuinely references the catalog entry rather than a copy of its name.
    let venueId: string | null = null;
    let venueName = command.venueName.trim() || "Store";
    let roomId: string | null = null;
    let roomName = command.roomName?.trim() || null;

    if (command.venueId) {
      const venue = await this.venues.findById(command.venueId, command.organizationId);

      if (!venue) {
        return failure("Selected venue not found.");
      }

      venueId = venue.id;
      venueName = venue.name;

      if (command.roomId) {
        const room = await this.rooms.findById(command.roomId, venue.id);

        if (!room) {
          return failure("Selected room not found for this venue.");
        }

        roomId = room.id;
        roomName = room.name;
      }
    }

    let event: Event;

    const status = command.publishImmediately === false ? "draft" : "published";

    try {
      event = new Event(
        this.createId(),
        command.organizationId,
        title,
        command.description.trim(),
        status,
        "public",
        command.startsAt,
        command.endsAt,
        command.capacity,
        0,
        command.waitlistEnabled,
        command.entryFeeInCents > 0 ? Money.usd(command.entryFeeInCents) : null,
        null,
        command.gameSystemLabel.trim() || "Other",
        venueId,
        venueName,
        roomId,
        roomName,
      );
    } catch (error) {
      return failure(error instanceof Error ? error.message : "Unable to create event.");
    }

    await this.events.save(event);

    // Fire-and-forget: announce on Discord if a webhook is configured.
    const organization = await this.organizations.findById(command.organizationId);

    // Only announce on Discord when publishing immediately — drafts are silent.
    if (command.publishImmediately !== false && organization?.discordWebhookUrl) {
      const eventDate = event.startsAt.toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });

      await this.discord.sendEventAnnouncement({
        webhookUrl: organization.discordWebhookUrl,
        organizationName: organization.name,
        eventTitle: event.title,
        gameSystemLabel: event.gameSystemLabel,
        venueName: event.venueName,
        eventDate,
        capacity: event.capacity,
        entryFeeInCents: event.entryFee?.amountInCents ?? 0,
        publicUrl: `${command.appBaseUrl}/events/${event.id}`,
      });
    }

    return success(event);
  }
}

