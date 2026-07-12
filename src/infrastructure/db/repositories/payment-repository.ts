import { eq } from "drizzle-orm";
import { Payment, type PaymentId } from "../../../domain/payments/payment";
import { Money } from "../../../domain/shared/money";
import type { RegistrationId } from "../../../domain/registrations/registration";
import type { PaymentRepository } from "../../../application/payments/ports";
import type { Database } from "../client";
import { payments } from "../schema";
import type { payments as PaymentsTable } from "../schema";

type PaymentRow = typeof PaymentsTable.$inferSelect;

function toDomain(row: PaymentRow): Payment {
  return new Payment(
    row.id,
    row.registrationId,
    Money.usd(row.amountInCents),
    row.provider,
    row.status,
    row.providerReference,
    row.recordedAt,
  );
}

export class DrizzlePaymentRepository implements PaymentRepository {
  public constructor(private readonly db: Database) {}

  public async findByRegistrationId(registrationId: RegistrationId): Promise<Payment | null> {
    const [row] = await this.db
      .select()
      .from(payments)
      .where(eq(payments.registrationId, registrationId))
      .limit(1);

    return row ? toDomain(row) : null;
  }

  public async findById(paymentId: PaymentId): Promise<Payment | null> {
    const [row] = await this.db.select().from(payments).where(eq(payments.id, paymentId)).limit(1);
    return row ? toDomain(row) : null;
  }

  public async save(payment: Payment): Promise<void> {
    const values = {
      id: payment.id,
      registrationId: payment.registrationId,
      amountInCents: payment.amount.amountInCents,
      provider: payment.provider,
      status: payment.status,
      providerReference: payment.providerReference,
      recordedAt: payment.recordedAt,
    };

    await this.db
      .insert(payments)
      .values(values)
      .onConflictDoUpdate({ target: payments.id, set: values });
  }
}
