import type { Event, EventId } from "../../domain/events/event";
import type { Membership } from "../../domain/organizations/membership";
import type { OrganizationId } from "../../domain/organizations/organization";
import { failure, type Result } from "../../domain/shared/result";
import { requireEventManagement } from "../shared/authorization";
import type { EventRepository } from "./ports";

export type UpdateEventCommand = { organizationId: OrganizationId; actorMembership: Membership | null; eventId: EventId;
  title: string; description: string; gameSystemLabel: string; startsAt: Date; endsAt: Date; capacity: number;
  gameSystemId: string | null; entryFeeInCents: number; waitlistEnabled: boolean };

export class UpdateEventUseCase {
  public constructor(private readonly events: EventRepository) {}
  public async execute(command: UpdateEventCommand): Promise<Result<Event>> {
    const authorization = requireEventManagement(command.actorMembership); if (!authorization.ok) return authorization;
    const event = await this.events.findByIdForOrganization(command.eventId, command.organizationId);
    if (!event) return failure("Event not found.");
    const result = event.updateDetails({ title: command.title, description: command.description,
      gameSystemLabel: command.gameSystemLabel, gameSystemId: command.gameSystemId, venueId: null, venueName: "Local game night", roomId: null, roomName: null,
      startsAt: command.startsAt, endsAt: command.endsAt, capacity: command.capacity,
      entryFeeInCents: command.entryFeeInCents, waitlistEnabled: command.waitlistEnabled });
    if (!result.ok) return result; await this.events.save(result.value); return result;
  }
}
