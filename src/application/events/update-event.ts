import type { Event, EventId } from "../../domain/events/event";
import type { Membership } from "../../domain/organizations/membership";
import type { OrganizationId } from "../../domain/organizations/organization";
import { failure, type Result } from "../../domain/shared/result";
import { requireEventManagement } from "../shared/authorization";
import type { VenueRepository, RoomRepository } from "../venues/ports";
import type { EventRepository } from "./ports";

export type UpdateEventCommand = {
  organizationId: OrganizationId;
  actorMembership: Membership | null;
  eventId: EventId;
  title: string;
  description: string;
  gameSystemLabel: string;
  venueId: string | null;
  venueName: string;
  roomId: string | null;
  roomName: string | null;
  startsAt: Date;
  endsAt: Date;
  capacity: number;
  entryFeeInCents: number;
  waitlistEnabled: boolean;
};

export class UpdateEventUseCase {
  public constructor(
    private readonly events: EventRepository,
    private readonly venues: VenueRepository,
    private readonly rooms: RoomRepository,
  ) {}

  public async execute(command: UpdateEventCommand): Promise<Result<Event>> {
    const authorization = requireEventManagement(command.actorMembership);

    if (!authorization.ok) {
      return authorization;
    }

    const event = await this.events.findByIdForOrganization(command.eventId, command.organizationId);

    if (!event) {
      return failure("Event not found.");
    }

    let venueId: string | null = null;
    let venueName = command.venueName;
    let roomId: string | null = null;
    let roomName = command.roomName;

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

    const result = event.updateDetails({
      title: command.title,
      description: command.description,
      gameSystemLabel: command.gameSystemLabel,
      venueId,
      venueName,
      roomId,
      roomName,
      startsAt: command.startsAt,
      endsAt: command.endsAt,
      capacity: command.capacity,
      entryFeeInCents: command.entryFeeInCents,
      waitlistEnabled: command.waitlistEnabled,
    });

    if (!result.ok) {
      return result;
    }

    await this.events.save(result.value);

    return result;
  }
}
