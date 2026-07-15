import { Registration } from "../../domain/registrations/registration";
import { WaitlistEntry } from "../../domain/registrations/waitlist-entry";
import { failure, success, type Result } from "../../domain/shared/result";
import type { EventId } from "../../domain/events/event";
import type { MemberProfileId } from "../../domain/members/member-profile";
import type { OrganizationId } from "../../domain/organizations/organization";
import type { EventRepository } from "../events/ports";
import type { MemberRepository } from "../members/ports";
import type { RegistrationRepository, WaitlistRepository } from "./ports";

export class RegisterForEventUseCase {
  public constructor(
    private readonly events: EventRepository,
    private readonly members: MemberRepository,
    private readonly registrations: RegistrationRepository,
    private readonly waitlist: WaitlistRepository,
    private readonly createRegistrationId: () => string,
    private readonly createWaitlistId: () => string,
  ) {}

  public async execute(command: { organizationId: OrganizationId; eventId: EventId; memberProfileId: MemberProfileId }): Promise<Result<{ kind: "confirmed" | "waitlisted"; id: string }>> {
    const event = await this.events.findByIdForOrganization(command.eventId, command.organizationId);
    if (!event) return failure("Event not found.");
    const member = await this.members.findById(command.memberProfileId);
    if (!member || member.organizationId !== command.organizationId || !member.canRegisterForEvents) return failure("Active player not found.");
    if (await this.registrations.findActiveForEventMember(event.id, member.id)) return failure("That player is already registered.");
    if (await this.waitlist.findActiveForEventMember(event.id, member.id)) return failure("That player is already waitlisted.");
    const mode = event.canRegister();
    if (!mode.ok) return mode;
    if (mode.value === "waitlisted") {
      const entry = new WaitlistEntry(this.createWaitlistId(), event.id, member.id,
        (await this.waitlist.countActiveForEvent(event.id)) + 1, "waiting", new Date());
      await this.waitlist.save(entry);
      return success({ kind: "waitlisted", id: entry.id });
    }
    const registration = new Registration(this.createRegistrationId(), event.id, member.id,
      event.requiresPayment() ? "pending_payment" : "confirmed", new Date(), null);
    await this.registrations.save(registration);
    return success({ kind: "confirmed", id: registration.id });
  }
}
