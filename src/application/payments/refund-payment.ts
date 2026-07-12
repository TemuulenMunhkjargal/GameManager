import type { Payment } from "../../domain/payments/payment";
import type { Membership } from "../../domain/organizations/membership";
import type { OrganizationId } from "../../domain/organizations/organization";
import type { RegistrationId } from "../../domain/registrations/registration";
import { failure, type Result } from "../../domain/shared/result";
import { requireBillingManagement } from "../shared/authorization";
import type { EmailGateway } from "../shared/email-gateway";
import type { EventRepository } from "../events/ports";
import type { MemberRepository } from "../members/ports";
import type { RegistrationRepository } from "../registrations/ports";
import type { PaymentRepository } from "./ports";

export type RefundPaymentCommand = {
  organizationId: OrganizationId;
  actorMembership: Membership | null;
  eventId: string;
  registrationId: RegistrationId;
};

export class RefundPaymentUseCase {
  public constructor(
    private readonly events: EventRepository,
    private readonly registrations: RegistrationRepository,
    private readonly members: MemberRepository,
    private readonly payments: PaymentRepository,
    private readonly email: EmailGateway,
  ) {}

  public async execute(command: RefundPaymentCommand): Promise<Result<Payment>> {
    const authorization = requireBillingManagement(command.actorMembership);

    if (!authorization.ok) {
      return authorization;
    }

    const payment = await this.payments.findByRegistrationId(command.registrationId);

    if (!payment) {
      return failure("No payment found for this registration.");
    }

    const result = payment.refund();

    if (!result.ok) {
      return result;
    }

    await this.payments.save(result.value);

    // Fire-and-forget: let the attendee know their refund was processed.
    const registration = await this.registrations.findById(command.registrationId, command.eventId);
    const event = await this.events.findByIdForOrganization(command.eventId, command.organizationId);

    if (registration && event) {
      const member = await this.members.findById(registration.memberProfileId);

      if (member?.email) {
        await this.email.sendRefundConfirmation({
          to: member.email,
          attendeeName: member.displayName,
          eventTitle: event.title,
          amountInCents: result.value.amount.amountInCents,
        });
      }
    }

    return result;
  }
}
