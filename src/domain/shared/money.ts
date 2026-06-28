export type CurrencyCode = "USD";

export class Money {
  private constructor(
    public readonly amountInCents: number,
    public readonly currency: CurrencyCode,
  ) {}

  public static usd(amountInCents: number): Money {
    if (!Number.isInteger(amountInCents) || amountInCents < 0) {
      throw new Error("Money amount must be a non-negative integer of cents.");
    }

    return new Money(amountInCents, "USD");
  }

  public isZero(): boolean {
    return this.amountInCents === 0;
  }
}

