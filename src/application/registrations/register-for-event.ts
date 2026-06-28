import { Registration } from "../../domain/registrations/registration";
import { failure, success, type Result } from "../../domain/shared/result";
import type { EventId } from "../../domain/events/event";
import type { MemberProfileId } from "../../domain/members/member-profile";
import type { OrganizationId } from "../../domain/organizations/organization";
import type { EventRepository } from "../events/ports";
import type { RegistrationRepository } from "./ports";

export type RegisterForEventCommand = {
  organizationId: OrganizationId;
  eventId: EventId;
  memberProfileId: MemberProfileId;
};

export class RegisterForEventUseCase {
  public constructor(
    private readonly events: EventRepository,
    private readonly registrations: RegistrationRepository,
    private readonly createId: () => string,
  ) {}

  public async execute(command: RegisterForEventCommand): Promise<Result<Registration>> {
    const event = await this.events.findByIdForOrganization(
      command.eventId,
      command.organizationId,
    );

    if (!event) {
      return failure("Event not found.");
    }

    const existingRegistration = await this.registrations.findActiveForEventMember(
      command.eventId,
      command.memberProfileId,
    );

    if (existingRegistration) {
      return failure("Member already has an active registration for this event.");
    }

    const registrationMode = event.canRegister();

    if (!registrationMode.ok) {
      return registrationMode;
    }

    if (registrationMode.value === "waitlisted") {
      return failure("Waitlist flow is not implemented yet.");
    }

    const registration = new Registration(
      this.createId(),
      event.id,
      command.memberProfileId,
      event.requiresPayment() ? "pending_payment" : "confirmed",
      new Date(),
      null,
    );

    await this.registrations.save(registration);

    return success(registration);
  }
}

