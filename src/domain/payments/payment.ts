import { Entity } from "../shared/entity";
import { failure, success, type Result } from "../shared/result";
import type { Money } from "../shared/money";
import type { RegistrationId } from "../registrations/registration";

export type PaymentId = string;
export type PaymentProvider = "manual";
export type PaymentStatus = "requires_payment" | "paid" | "failed" | "refunded";

export class Payment extends Entity<PaymentId> {
  public constructor(
    id: PaymentId,
    public readonly registrationId: RegistrationId,
    public readonly amount: Money,
    public readonly provider: PaymentProvider,
    public readonly status: PaymentStatus,
    public readonly providerReference: string | null,
    public readonly recordedAt: Date,
  ) {
    super(id);
  }

  public get isSettled(): boolean {
    return this.status === "paid";
  }

  public markPaid(now = new Date()): Result<Payment> {
    if (this.status !== "requires_payment") {
      return failure("Only payments awaiting collection can be marked paid.");
    }

    return success(
      new Payment(
        this.id,
        this.registrationId,
        this.amount,
        this.provider,
        "paid",
        this.providerReference,
        now,
      ),
    );
  }

  public markFailed(): Result<Payment> {
    if (this.status !== "requires_payment") {
      return failure("Only payments awaiting collection can be marked failed.");
    }

    return success(
      new Payment(
        this.id,
        this.registrationId,
        this.amount,
        this.provider,
        "failed",
        this.providerReference,
        this.recordedAt,
      ),
    );
  }

  public refund(): Result<Payment> {
    if (this.status !== "paid") {
      return failure("Only paid payments can be refunded.");
    }

    return success(
      new Payment(
        this.id,
        this.registrationId,
        this.amount,
        this.provider,
        "refunded",
        this.providerReference,
        this.recordedAt,
      ),
    );
  }
}
