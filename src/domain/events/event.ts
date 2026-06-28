import { Entity } from "../shared/entity";
import { failure, success, type Result } from "../shared/result";
import type { Money } from "../shared/money";
import type { GameSystemId } from "../game-systems/game-system";
import type { OrganizationId } from "../organizations/organization";

export type EventId = string;
export type VenueId = string;
export type RoomId = string;
export type EventStatus = "draft" | "published" | "cancelled" | "completed";
export type EventVisibility = "public" | "unlisted" | "private";

export class Event extends Entity<EventId> {
  public constructor(
    id: EventId,
    public readonly organizationId: OrganizationId,
    public readonly title: string,
    public readonly status: EventStatus,
    public readonly visibility: EventVisibility,
    public readonly startsAt: Date,
    public readonly endsAt: Date,
    public readonly capacity: number,
    public readonly confirmedRegistrationCount: number,
    public readonly waitlistEnabled: boolean,
    public readonly entryFee: Money | null,
    public readonly gameSystemId: GameSystemId | null,
    public readonly venueId: VenueId | null,
    public readonly roomId: RoomId | null,
  ) {
    super(id);

    if (capacity < 0) {
      throw new Error("Event capacity cannot be negative.");
    }

    if (endsAt <= startsAt) {
      throw new Error("Event end time must be after start time.");
    }
  }

  public hasCapacity(): boolean {
    return this.confirmedRegistrationCount < this.capacity;
  }

  public canRegister(now = new Date()): Result<"confirmed" | "waitlisted"> {
    if (this.status !== "published") {
      return failure("Event is not open for registration.");
    }

    if (this.startsAt <= now) {
      return failure("Event has already started.");
    }

    if (this.hasCapacity()) {
      return success("confirmed");
    }

    if (this.waitlistEnabled) {
      return success("waitlisted");
    }

    return failure("Event is full.");
  }

  public requiresPayment(): boolean {
    return !!this.entryFee && !this.entryFee.isZero();
  }
}

