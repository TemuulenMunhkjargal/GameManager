import { Payment } from "../../domain/payments/payment";
import type { Membership } from "../../domain/organizations/membership";
import { failure, success, type Result } from "../../domain/shared/result";
import type { EventId } from "../../domain/events/event";
import type { Registration, RegistrationId } from "../../domain/registrations/registration";
import type { OrganizationId } from "../../domain/organizations/organization";
import type { EventRepository } from "../events/ports";
import type { MemberRepository } from "../members/ports";
import type { RegistrationRepository } from "../registrations/ports";
import { requireEventManagement } from "../shared/authorization";
import type { EmailGateway } from "../shared/email-gateway";
import type { PaymentRepository } from "./ports";

export type RecordManualPaymentCommand = {
  organizationId: OrganizationId;
  actorMembership: Membership | null;
  eventId: EventId;
  registrationId: RegistrationId;
};

export type RecordManualPaymentOutcome = {
  registration: Registration;
  payment: Payment;
};

export class RecordManualPaymentUseCase {
  public constructor(
    private readonly events: EventRepository,
    private readonly registrations: RegistrationRepository,
    private readonly members: MemberRepository,
    private readonly payments: PaymentRepository,
    private readonly email: EmailGateway,
    private readonly createPaymentId: () => string,
  ) {}

  public async execute(command: RecordManualPaymentCommand): Promise<Result<RecordManualPaymentOutcome>> {
    const authorization = requireEventManagement(command.actorMembership);

    if (!authorization.ok) {
      return authorization;
    }

    const event = await this.events.findByIdForOrganization(command.eventId, command.organizationId);

    if (!event) {
      return failure("Event not found.");
    }

    if (!event.entryFee) {
      return failure("This event is free; there's no entry fee to collect.");
    }

    const registration = await this.registrations.findById(command.registrationId, command.eventId);

    if (!registration) {
      return failure("Registration not found.");
    }

    const confirmResult = registration.confirmPayment();

    if (!confirmResult.ok) {
      return confirmResult;
    }

    let payment = await this.payments.findByRegistrationId(command.registrationId);

    if (payment && payment.isSettled) {
      return failure("This registration has already been paid.");
    }

    if (!payment) {
      payment = new Payment(
        this.createPaymentId(),
        command.registrationId,
        event.entryFee,
        "manual",
        "requires_payment",
        null,
        new Date(),
      );
    }

    const paidResult = payment.markPaid();

    if (!paidResult.ok) {
      return paidResult;
    }

    await this.payments.save(paidResult.value);
    await this.registrations.save(confirmResult.value);

    // Fire-and-forget: let the attendee know their payment was recorded.
    const member = await this.members.findById(registration.memberProfileId);

    if (member?.email) {
      const eventDate = event.startsAt.toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });

      await this.email.sendPaymentConfirmation({
        to: member.email,
        attendeeName: member.displayName,
        eventTitle: event.title,
        eventDate,
        amountInCents: event.entryFee!.amountInCents,
      });
    }

    return success({ registration: confirmResult.value, payment: paidResult.value });
  }
}
