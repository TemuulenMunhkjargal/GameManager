import type { Payment, PaymentId } from "../../domain/payments/payment";
import type { RegistrationId } from "../../domain/registrations/registration";

export interface PaymentRepository {
  findByRegistrationId(registrationId: RegistrationId): Promise<Payment | null>;
  findById(paymentId: PaymentId): Promise<Payment | null>;
  save(payment: Payment): Promise<void>;
}

export type PaymentSummaryDTO = {
  id: PaymentId;
  registrationId: RegistrationId;
  amountInCents: number;
  provider: string;
  status: string;
  recordedAt: string;
};
