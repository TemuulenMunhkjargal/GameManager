import { Entity } from "../shared/entity";
import { failure, success, type Result } from "../shared/result";
import type { EventId } from "../events/event";
import type { MemberProfileId } from "../members/member-profile";

export type RegistrationId = string;
export type RegistrationStatus = "pending_payment" | "confirmed" | "cancelled" | "checked_in";

export class Registration extends Entity<RegistrationId> {
  public constructor(
    id: RegistrationId,
    public readonly eventId: EventId,
    public readonly memberProfileId: MemberProfileId,
    public readonly status: RegistrationStatus,
    public readonly registeredAt: Date,
    public readonly checkedInAt: Date | null,
  ) {
    super(id);
  }

  public checkIn(now = new Date()): Result<Registration> {
    if (this.status !== "confirmed") {
      return failure("Only confirmed registrations can be checked in.");
    }

    return success(
      new Registration(
        this.id,
        this.eventId,
        this.memberProfileId,
        "checked_in",
        this.registeredAt,
        now,
      ),
    );
  }

  public confirmPayment(): Result<Registration> {
    if (this.status !== "pending_payment") {
      return failure("Only registrations awaiting payment can be confirmed by payment.");
    }

    return success(
      new Registration(
        this.id,
        this.eventId,
        this.memberProfileId,
        "confirmed",
        this.registeredAt,
        this.checkedInAt,
      ),
    );
  }

  public cancel(): Result<Registration> {
    if (this.status === "checked_in") {
      return failure("Checked-in registrations cannot be cancelled.");
    }

    return success(
      new Registration(
        this.id,
        this.eventId,
        this.memberProfileId,
        "cancelled",
        this.registeredAt,
        this.checkedInAt,
      ),
    );
  }
}

