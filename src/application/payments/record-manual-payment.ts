import { Payment } from "../../domain/payments/payment";
import { failure, success, type Result } from "../../domain/shared/result";
import type { EventId } from "../../domain/events/event";
import type { Registration, RegistrationId } from "../../domain/registrations/registration";
import type { OrganizationId } from "../../domain/organizations/organization";
import type { EventRepository } from "../events/ports";
import type { RegistrationRepository } from "../registrations/ports";
import type { PaymentRepository } from "./ports";

export type RecordManualPaymentCommand = {
  organizationId: OrganizationId;
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
    private readonly payments: PaymentRepository,
    private readonly createPaymentId: () => string,
  ) {}

  public async execute(command: RecordManualPaymentCommand): Promise<Result<RecordManualPaymentOutcome>> {
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

    return success({ registration: confirmResult.value, payment: paidResult.value });
  }
}
