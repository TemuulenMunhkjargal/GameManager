import { Registration } from "../../domain/registrations/registration";
import type { Membership } from "../../domain/organizations/membership";
import { failure, success, type Result } from "../../domain/shared/result";
import type { EventId } from "../../domain/events/event";
import type { RegistrationId } from "../../domain/registrations/registration";
import type { EventRepository } from "../events/ports";
import type { MemberRepository } from "../members/ports";
import { requireEventManagement } from "../shared/authorization";
import type { EmailGateway } from "../shared/email-gateway";
import type { RegistrationRepository, WaitlistRepository } from "./ports";

export type CancelRegistrationCommand = {
  organizationId: string;
  actorMembership: Membership | null;
  eventId: EventId;
  registrationId: RegistrationId;
};

export type CancelRegistrationOutcome = {
  cancelled: Registration;
  promoted: Registration | null;
};

export class CancelRegistrationUseCase {
  public constructor(
    private readonly events: EventRepository,
    private readonly registrations: RegistrationRepository,
    private readonly waitlist: WaitlistRepository,
    private readonly members: MemberRepository,
    private readonly email: EmailGateway,
    private readonly createRegistrationId: () => string,
  ) {}

  public async execute(command: CancelRegistrationCommand): Promise<Result<CancelRegistrationOutcome>> {
    const authorization = requireEventManagement(command.actorMembership);

    if (!authorization.ok) {
      return authorization;
    }

    const registration = await this.registrations.findById(command.registrationId, command.eventId);

    if (!registration) {
      return failure("Registration not found.");
    }

    const cancelResult = registration.cancel();

    if (!cancelResult.ok) {
      return cancelResult;
    }

    await this.registrations.save(cancelResult.value);

    const nextInLine = await this.waitlist.findNextWaiting(command.eventId);

    if (!nextInLine) {
      return success({ cancelled: cancelResult.value, promoted: null });
    }

    const promoteResult = nextInLine.promote();

    if (!promoteResult.ok) {
      return success({ cancelled: cancelResult.value, promoted: null });
    }

    await this.waitlist.save(promoteResult.value);

    const event = await this.events.findByIdForOrganization(command.eventId, command.organizationId);
    const requiresPayment = event?.requiresPayment() ?? false;

    const promotedRegistration = new Registration(
      this.createRegistrationId(),
      command.eventId,
      nextInLine.memberProfileId,
      requiresPayment ? "pending_payment" : "confirmed",
      new Date(),
      null,
    );

    await this.registrations.save(promotedRegistration);

    // Fire-and-forget: email the promoted person
    if (event) {
      const promotedMember = await this.members.findById(nextInLine.memberProfileId);

      if (promotedMember?.email) {
        const eventDate = event.startsAt.toLocaleDateString("en-US", {
          weekday: "long",
          month: "long",
          day: "numeric",
          year: "numeric",
          hour: "numeric",
          minute: "2-digit",
        });

        await this.email.sendWaitlistPromotion({
          to: promotedMember.email,
          attendeeName: promotedMember.displayName,
          eventTitle: event.title,
          eventDate,
          venueName: event.venueName,
          entryFeeInCents: event.entryFee?.amountInCents ?? 0,
        });
      }
    }

    return success({ cancelled: cancelResult.value, promoted: promotedRegistration });
  }
}
