import { Event } from "../../domain/events/event";
import type { Membership } from "../../domain/organizations/membership";
import { Money } from "../../domain/shared/money";
import { failure, success, type Result } from "../../domain/shared/result";
import type { OrganizationId } from "../../domain/organizations/organization";
import { requireEventManagement } from "../shared/authorization";
import type { EventRepository } from "./ports";

export type CreateEventCommand = {
  organizationId: OrganizationId;
  actorMembership: Membership | null;
  title: string;
  description: string;
  gameSystemLabel: string;
  venueName: string;
  roomName: string | null;
  startsAt: Date;
  endsAt: Date;
  capacity: number;
  entryFeeInCents: number;
  waitlistEnabled: boolean;
};

export class CreateEventUseCase {
  public constructor(
    private readonly events: EventRepository,
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

    let event: Event;

    try {
      event = new Event(
        this.createId(),
        command.organizationId,
        title,
        command.description.trim(),
        "published",
        "public",
        command.startsAt,
        command.endsAt,
        command.capacity,
        0,
        command.waitlistEnabled,
        command.entryFeeInCents > 0 ? Money.usd(command.entryFeeInCents) : null,
        null,
        command.gameSystemLabel.trim() || "Other",
        null,
        command.venueName.trim() || "Store",
        null,
        command.roomName?.trim() || null,
      );
    } catch (error) {
      return failure(error instanceof Error ? error.message : "Unable to create event.");
    }

    await this.events.save(event);

    return success(event);
  }
}
