import { Entity } from "../shared/entity";
import type { Money } from "../shared/money";
import type { RegistrationId } from "../registrations/registration";

export type PaymentId = string;
export type PaymentProvider = "stripe";
export type PaymentStatus = "requires_payment" | "paid" | "failed" | "refunded";

export class Payment extends Entity<PaymentId> {
  public constructor(
    id: PaymentId,
    public readonly registrationId: RegistrationId,
    public readonly amount: Money,
    public readonly provider: PaymentProvider,
    public readonly status: PaymentStatus,
    public readonly providerReference: string | null,
  ) {
    super(id);
  }

  public get isSettled(): boolean {
    return this.status === "paid";
  }
}

