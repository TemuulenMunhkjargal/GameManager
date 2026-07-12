import { Entity } from "../shared/entity";
import { failure, success, type Result } from "../shared/result";
import type { VenueId } from "./venue";

export type RoomId = string;

export class Room extends Entity<RoomId> {
  public constructor(
    id: RoomId,
    public readonly venueId: VenueId,
    public readonly name: string,
    public readonly capacity: number | null,
  ) {
    super(id);
  }

  public static create(options: {
    id: RoomId;
    venueId: VenueId;
    name: string;
    capacity: number | null;
  }): Result<Room> {
    const name = options.name.trim();

    if (!name) {
      return failure("Room name is required.");
    }

    if (options.capacity !== null && options.capacity < 1) {
      return failure("Room capacity must be at least 1.");
    }

    return success(new Room(options.id, options.venueId, name, options.capacity));
  }
}
