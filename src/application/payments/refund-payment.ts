import type { Payment } from "../../domain/payments/payment";
import type { RegistrationId } from "../../domain/registrations/registration";
import { failure, type Result } from "../../domain/shared/result";
import type { PaymentRepository } from "./ports";

export type RefundPaymentCommand = {
  registrationId: RegistrationId;
};

export class RefundPaymentUseCase {
  public constructor(private readonly payments: PaymentRepository) {}

  public async execute(command: RefundPaymentCommand): Promise<Result<Payment>> {
    const payment = await this.payments.findByRegistrationId(command.registrationId);

    if (!payment) {
      return failure("No payment found for this registration.");
    }

    const result = payment.refund();

    if (!result.ok) {
      return result;
    }

    await this.payments.save(result.value);

    return result;
  }
}
