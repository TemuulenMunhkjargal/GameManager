import { Registration } from "../../domain/registrations/registration";
import { WaitlistEntry } from "../../domain/registrations/waitlist-entry";
import { failure, success, type Result } from "../../domain/shared/result";
import type { EventId } from "../../domain/events/event";
import type { MemberProfileId } from "../../domain/members/member-profile";
import type { OrganizationId } from "../../domain/organizations/organization";
import type { EventRepository } from "../events/ports";
import type { RegistrationRepository, WaitlistRepository } from "./ports";

export type RegisterForEventCommand = {
  organizationId: OrganizationId;
  eventId: EventId;
  memberProfileId: MemberProfileId;
};

export type RegisterForEventOutcome =
  | { kind: "confirmed"; registration: Registration }
  | { kind: "waitlisted"; waitlistEntry: WaitlistEntry };

export class RegisterForEventUseCase {
  public constructor(
    private readonly events: EventRepository,
    private readonly registrations: RegistrationRepository,
    private readonly waitlist: WaitlistRepository,
    private readonly createRegistrationId: () => string,
    private readonly createWaitlistEntryId: () => string,
  ) {}

  public async execute(command: RegisterForEventCommand): Promise<Result<RegisterForEventOutcome>> {
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

    const existingWaitlistEntry = await this.waitlist.findActiveForEventMember(
      command.eventId,
      command.memberProfileId,
    );

    if (existingWaitlistEntry) {
      return failure("Member is already on the waitlist for this event.");
    }

    const registrationMode = event.canRegister();

    if (!registrationMode.ok) {
      return registrationMode;
    }

    if (registrationMode.value === "waitlisted") {
      const position = (await this.waitlist.countActiveForEvent(command.eventId)) + 1;

      const waitlistEntry = new WaitlistEntry(
        this.createWaitlistEntryId(),
        event.id,
        command.memberProfileId,
        position,
        "waiting",
        new Date(),
      );

      await this.waitlist.save(waitlistEntry);

      return success({ kind: "waitlisted", waitlistEntry });
    }

    const registration = new Registration(
      this.createRegistrationId(),
      event.id,
      command.memberProfileId,
      event.requiresPayment() ? "pending_payment" : "confirmed",
      new Date(),
      null,
    );

    await this.registrations.save(registration);

    return success({ kind: "confirmed", registration });
  }
}
