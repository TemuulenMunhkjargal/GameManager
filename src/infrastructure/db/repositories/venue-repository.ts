import { and, eq } from "drizzle-orm";
import { Venue, type VenueId } from "../../../domain/organizations/venue";
import { Room, type RoomId } from "../../../domain/organizations/room";
import type { OrganizationId } from "../../../domain/organizations/organization";
import type { VenueQueries, VenueRepository, RoomRepository, VenueSummaryDTO } from "../../../application/venues/ports";
import type { Database } from "../client";
import { venues, rooms } from "../schema";

export class DrizzleVenueRepository implements VenueRepository, VenueQueries {
  public constructor(private readonly db: Database) {}

  public async findById(venueId: VenueId, organizationId: OrganizationId): Promise<Venue | null> {
    const [row] = await this.db.select().from(venues)
      .where(and(eq(venues.id, venueId), eq(venues.organizationId, organizationId))).limit(1);
    return row ? new Venue(row.id, row.organizationId, row.name, row.address, row.status) : null;
  }

  public async save(venue: Venue): Promise<void> {
    const v = { id: venue.id, organizationId: venue.organizationId, name: venue.name, address: venue.address, status: venue.status };
    await this.db.insert(venues).values(v).onConflictDoUpdate({ target: venues.id, set: v });
  }

  public async listForOrganization(
    organizationId: OrganizationId,
    options?: { includeArchived?: boolean },
  ): Promise<VenueSummaryDTO[]> {
    const venueRows = await this.db.select().from(venues)
      .where(
        options?.includeArchived
          ? eq(venues.organizationId, organizationId)
          : and(eq(venues.organizationId, organizationId), eq(venues.status, "active")),
      );

    return Promise.all(venueRows.map(async (v) => {
      const roomRows = await this.db.select().from(rooms).where(eq(rooms.venueId, v.id));
      return { id: v.id, name: v.name, address: v.address, status: v.status,
        rooms: roomRows.map((r) => ({ id: r.id, name: r.name, capacity: r.capacity })) };
    }));
  }
}

export class DrizzleRoomRepository implements RoomRepository {
  public constructor(private readonly db: Database) {}

  public async findById(roomId: RoomId, venueId: string): Promise<Room | null> {
    const [row] = await this.db.select().from(rooms)
      .where(and(eq(rooms.id, roomId), eq(rooms.venueId, venueId))).limit(1);
    return row ? new Room(row.id, row.venueId, row.name, row.capacity) : null;
  }

  public async save(room: Room): Promise<void> {
    const v = { id: room.id, venueId: room.venueId, name: room.name, capacity: room.capacity };
    await this.db.insert(rooms).values(v).onConflictDoUpdate({ target: rooms.id, set: v });
  }
}
