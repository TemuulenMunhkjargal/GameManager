import { Entity } from "../shared/entity";
import { failure, success, type Result } from "../shared/result";
import type { EventId } from "../events/event";
import type { MemberProfileId } from "../members/member-profile";

export type WaitlistEntryId = string;
export type WaitlistStatus = "waiting" | "promoted" | "withdrawn";

export class WaitlistEntry extends Entity<WaitlistEntryId> {
  public constructor(
    id: WaitlistEntryId,
    public readonly eventId: EventId,
    public readonly memberProfileId: MemberProfileId,
    public readonly position: number,
    public readonly status: WaitlistStatus,
    public readonly joinedAt: Date,
  ) {
    super(id);

    if (position < 1) {
      throw new Error("Waitlist position must be at least 1.");
    }
  }

  public get isActive(): boolean {
    return this.status === "waiting";
  }

  public promote(): Result<WaitlistEntry> {
    if (this.status !== "waiting") {
      return failure("Only waiting entries can be promoted.");
    }

    return success(
      new WaitlistEntry(this.id, this.eventId, this.memberProfileId, this.position, "promoted", this.joinedAt),
    );
  }

  public withdraw(): Result<WaitlistEntry> {
    if (this.status !== "waiting") {
      return failure("Only waiting entries can be withdrawn.");
    }

    return success(
      new WaitlistEntry(this.id, this.eventId, this.memberProfileId, this.position, "withdrawn", this.joinedAt),
    );
  }
}
