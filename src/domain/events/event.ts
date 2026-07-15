import { Entity } from "../shared/entity";
import { failure, success, type Result } from "../shared/result";
import { Money } from "../shared/money";
import type { GameSystemId } from "../game-systems/game-system";
import type { OrganizationId } from "../organizations/organization";

export type EventId = string;
export type VenueId = string;
export type RoomId = string;
export type EventStatus = "draft" | "published" | "cancelled" | "completed";
export type EventVisibility = "public" | "unlisted" | "private";

export type EventDetailsUpdate = {
  title: string;
  description: string;
  gameSystemLabel: string;
  gameSystemId: GameSystemId | null;
  venueId: VenueId | null;
  venueName: string;
  roomId: RoomId | null;
  roomName: string | null;
  startsAt: Date;
  endsAt: Date;
  capacity: number;
  entryFeeInCents: number;
  waitlistEnabled: boolean;
};

export class Event extends Entity<EventId> {
  public constructor(
    id: EventId,
    public readonly organizationId: OrganizationId,
    public readonly title: string,
    public readonly description: string,
    public readonly status: EventStatus,
    public readonly visibility: EventVisibility,
    public readonly startsAt: Date,
    public readonly endsAt: Date,
    public readonly capacity: number,
    public readonly confirmedRegistrationCount: number,
    public readonly waitlistEnabled: boolean,
    public readonly entryFee: Money | null,
    public readonly gameSystemId: GameSystemId | null,
    public readonly gameSystemLabel: string,
    public readonly venueId: VenueId | null,
    public readonly venueName: string,
    public readonly roomId: RoomId | null,
    public readonly roomName: string | null,
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

  public publish(): Result<Event> {
    if (this.status === "published") {
      return failure("Event is already published.");
    }

    if (this.status === "cancelled") {
      return failure("Cancelled events cannot be re-published.");
    }

    return success(this.withStatus("published"));
  }

  public cancel(): Result<Event> {
    if (this.status === "cancelled") {
      return failure("Event is already cancelled.");
    }

    if (this.status === "completed") {
      return failure("Completed events cannot be cancelled.");
    }

    return success(this.withStatus("cancelled"));
  }

  public updateDetails(update: EventDetailsUpdate): Result<Event> {
    if (this.status === "cancelled") {
      return failure("Cancelled events cannot be edited.");
    }

    if (this.status === "completed") {
      return failure("Completed events cannot be edited.");
    }

    const title = update.title.trim();

    if (!title) {
      return failure("Event title is required.");
    }

    if (update.capacity < this.confirmedRegistrationCount) {
      return failure(
        `Capacity can't be set below the ${this.confirmedRegistrationCount} confirmed registration(s) this event already has.`,
      );
    }

    if (update.endsAt <= update.startsAt) {
      return failure("Event end time must be after start time.");
    }

    return success(
      new Event(
        this.id,
        this.organizationId,
        title,
        update.description.trim(),
        this.status,
        this.visibility,
        update.startsAt,
        update.endsAt,
        update.capacity,
        this.confirmedRegistrationCount,
        update.waitlistEnabled,
        update.entryFeeInCents > 0 ? Money.usd(update.entryFeeInCents) : null,
        update.gameSystemId,
        update.gameSystemLabel.trim() || "Other",
        update.venueId,
        update.venueName.trim() || "Store",
        update.roomId,
        update.roomName?.trim() || null,
      ),
    );
  }

  private withStatus(status: EventStatus): Event {
    return new Event(
      this.id,
      this.organizationId,
      this.title,
      this.description,
      status,
      this.visibility,
      this.startsAt,
      this.endsAt,
      this.capacity,
      this.confirmedRegistrationCount,
      this.waitlistEnabled,
      this.entryFee,
      this.gameSystemId,
      this.gameSystemLabel,
      this.venueId,
      this.venueName,
      this.roomId,
      this.roomName,
    );
  }
}

