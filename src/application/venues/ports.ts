import type { Venue, VenueId } from "../../domain/organizations/venue";
import type { Room, RoomId } from "../../domain/organizations/room";
import type { OrganizationId } from "../../domain/organizations/organization";

export interface VenueRepository {
  findById(venueId: VenueId, organizationId: OrganizationId): Promise<Venue | null>;
  save(venue: Venue): Promise<void>;
}

export interface RoomRepository {
  findById(roomId: RoomId, venueId: VenueId): Promise<Room | null>;
  save(room: Room): Promise<void>;
}

export type RoomDTO = { id: RoomId; name: string; capacity: number | null };

export type VenueSummaryDTO = {
  id: VenueId;
  name: string;
  address: string | null;
  status: string;
  rooms: RoomDTO[];
};

export interface VenueQueries {
  listForOrganization(
    organizationId: OrganizationId,
    options?: { includeArchived?: boolean },
  ): Promise<VenueSummaryDTO[]>;
}
