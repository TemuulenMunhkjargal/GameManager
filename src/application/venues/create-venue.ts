import { Venue } from "../../domain/organizations/venue";
import { Room } from "../../domain/organizations/room";
import type { Membership } from "../../domain/organizations/membership";
import type { OrganizationId } from "../../domain/organizations/organization";
import type { VenueId } from "../../domain/organizations/venue";
import type { Result } from "../../domain/shared/result";
import { requireEventManagement } from "../shared/authorization";
import type { VenueRepository, RoomRepository } from "./ports";

export class CreateVenueUseCase {
  public constructor(
    private readonly venues: VenueRepository,
    private readonly createId: () => string,
  ) {}

  public async execute(cmd: {
    organizationId: OrganizationId;
    actorMembership: Membership | null;
    name: string;
    address: string | null;
  }): Promise<Result<Venue>> {
    const auth = requireEventManagement(cmd.actorMembership);
    if (!auth.ok) return auth;

    const result = Venue.create({ id: this.createId(), organizationId: cmd.organizationId, name: cmd.name, address: cmd.address });
    if (!result.ok) return result;

    await this.venues.save(result.value);
    return result;
  }
}

export class CreateRoomUseCase {
  public constructor(
    private readonly venues: VenueRepository,
    private readonly rooms: RoomRepository,
    private readonly createId: () => string,
  ) {}

  public async execute(cmd: {
    organizationId: OrganizationId;
    actorMembership: Membership | null;
    venueId: VenueId;
    name: string;
    capacity: number | null;
  }): Promise<Result<Room>> {
    const auth = requireEventManagement(cmd.actorMembership);
    if (!auth.ok) return auth;

    const venue = await this.venues.findById(cmd.venueId, cmd.organizationId);
    if (!venue) {
      const { failure } = await import("../../domain/shared/result");
      return failure("Venue not found.");
    }

    const result = Room.create({ id: this.createId(), venueId: cmd.venueId, name: cmd.name, capacity: cmd.capacity });
    if (!result.ok) return result;

    await this.rooms.save(result.value);
    return result;
  }
}
