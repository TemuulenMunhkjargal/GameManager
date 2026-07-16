import type { Event, EventId } from "../../domain/events/event";
import type { OrganizationId } from "../../domain/organizations/organization";
import { failure, type Result } from "../../domain/shared/result";
import type { EventRepository } from "./ports";

export type EventLifecycleCommand = {
  organizationId: OrganizationId;
  eventId: EventId;
};

export class PublishEventUseCase {
  public constructor(private readonly events: EventRepository) {}

  public async execute(command: EventLifecycleCommand): Promise<Result<Event>> {
    const event = await this.events.findByIdForOrganization(command.eventId, command.organizationId);

    if (!event) {
      return failure("Event not found.");
    }

    const result = event.publish();

    if (!result.ok) {
      return result;
    }

    await this.events.save(result.value);

    return result;
  }
}

export class CancelEventUseCase {
  public constructor(private readonly events: EventRepository) {}

  public async execute(command: EventLifecycleCommand): Promise<Result<Event>> {
    const event = await this.events.findByIdForOrganization(command.eventId, command.organizationId);

    if (!event) {
      return failure("Event not found.");
    }

    const result = event.cancel();

    if (!result.ok) {
      return result;
    }

    await this.events.save(result.value);

    return result;
  }
}
