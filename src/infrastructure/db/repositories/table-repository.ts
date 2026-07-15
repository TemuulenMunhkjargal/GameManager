import { and, asc, eq, isNull, sql } from "drizzle-orm";
import type { TableRepository, GameTableDTO } from "../../../application/tables/ports";
import type { OrganizationId } from "../../../domain/organizations/organization";
import type { Database } from "../client";
import { gameTables, memberProfiles, tableSeats, tableSessions } from "../schema";

function id(prefix: string): string {
  return `${prefix}_${crypto.randomUUID().slice(0, 8)}`;
}

export class DrizzleTableRepository implements TableRepository {
  public constructor(private readonly db: Database) {}

  public async listForOrganization(organizationId: OrganizationId): Promise<GameTableDTO[]> {
    const tables = await this.db.select().from(gameTables)
      .where(and(eq(gameTables.organizationId, organizationId), eq(gameTables.status, "active"))).orderBy(asc(gameTables.createdAt));

    return Promise.all(tables.map(async (table) => {
      const [session] = await this.db.select().from(tableSessions)
        .where(and(eq(tableSessions.tableId, table.id), isNull(tableSessions.endedAt))).limit(1);
      const occupants = session ? await this.db
        .select({ id: tableSeats.id, memberProfileId: tableSeats.memberProfileId,
          guestName: tableSeats.guestName, memberName: memberProfiles.displayName,
          seatedAt: tableSeats.seatedAt })
        .from(tableSeats)
        .leftJoin(memberProfiles, eq(memberProfiles.id, tableSeats.memberProfileId))
        .where(and(eq(tableSeats.sessionId, session.id), isNull(tableSeats.releasedAt)))
        .orderBy(asc(tableSeats.seatedAt)) : [];

      return {
        id: table.id, name: table.name, capacity: table.capacity, status: table.status,
        sessionId: session?.id ?? null,
        occupiedSince: session?.startedAt.toISOString() ?? null,
        occupants: occupants.map((seat) => ({ id: seat.id,
          memberProfileId: seat.memberProfileId,
          name: seat.memberName ?? seat.guestName ?? "Deleted player",
          seatedAt: seat.seatedAt.toISOString() })),
      };
    }));
  }

  public async create(organizationId: OrganizationId, name: string, capacity: number): Promise<void> {
    this.validateTable(name, capacity);
    await this.db.insert(gameTables).values({ id: id("table"), organizationId, name: name.trim(), capacity });
  }

  public async update(organizationId: OrganizationId, tableId: string, name: string, capacity: number): Promise<void> {
    this.validateTable(name, capacity);
    const table = await this.getActiveTable(organizationId, tableId);
    const [session] = await this.db.select({ id: tableSessions.id }).from(tableSessions)
      .where(and(eq(tableSessions.tableId, table.id), isNull(tableSessions.endedAt))).limit(1);
    if (session) {
      const [row] = await this.db.select({ count: sql<number>`count(*)` }).from(tableSeats)
        .where(and(eq(tableSeats.sessionId, session.id), isNull(tableSeats.releasedAt)));
      if (Number(row?.count ?? 0) > capacity) throw new Error("Capacity cannot be lower than the number of people currently seated.");
    }
    await this.db.update(gameTables).set({ name: name.trim(), capacity }).where(eq(gameTables.id, table.id));
  }

  public async seat(input: { organizationId: OrganizationId; tableId: string;
    memberProfileId?: string | null; guestName?: string | null }): Promise<void> {
    const table = await this.getActiveTable(input.organizationId, input.tableId);
    if (!input.memberProfileId && !input.guestName?.trim()) throw new Error("Choose a player or enter a guest name.");

    if (input.memberProfileId) {
      const [member] = await this.db.select({ id: memberProfiles.id }).from(memberProfiles)
        .where(and(eq(memberProfiles.id, input.memberProfileId),
          eq(memberProfiles.organizationId, input.organizationId))).limit(1);
      if (!member) throw new Error("Player not found.");
      const [activeSeat] = await this.db.select({ id: tableSeats.id }).from(tableSeats)
        .innerJoin(tableSessions, eq(tableSessions.id, tableSeats.sessionId))
        .innerJoin(gameTables, eq(gameTables.id, tableSessions.tableId))
        .where(and(eq(gameTables.organizationId, input.organizationId),
          eq(tableSeats.memberProfileId, input.memberProfileId), isNull(tableSeats.releasedAt),
          isNull(tableSessions.endedAt))).limit(1);
      if (activeSeat) throw new Error("That player is already seated. Move them from their current table instead.");
    }

    const sessionId = await this.ensureSession(table.id);
    await this.ensureCapacity(table.capacity, sessionId);
    await this.db.insert(tableSeats).values({ id: id("seat"), sessionId,
      memberProfileId: input.memberProfileId ?? null,
      guestName: input.memberProfileId ? null : input.guestName!.trim() });
  }

  public async move(organizationId: OrganizationId, seatId: string, targetTableId: string): Promise<void> {
    const [seat] = await this.db.select({ id: tableSeats.id, memberProfileId: tableSeats.memberProfileId,
      guestName: tableSeats.guestName, sourceSessionId: tableSessions.id, sourceTableId: gameTables.id })
      .from(tableSeats).innerJoin(tableSessions, eq(tableSessions.id, tableSeats.sessionId))
      .innerJoin(gameTables, eq(gameTables.id, tableSessions.tableId))
      .where(and(eq(tableSeats.id, seatId), eq(gameTables.organizationId, organizationId),
        isNull(tableSeats.releasedAt), isNull(tableSessions.endedAt))).limit(1);
    if (!seat) throw new Error("Seated player not found.");
    if (seat.sourceTableId === targetTableId) return;

    const target = await this.getActiveTable(organizationId, targetTableId);
    const targetSessionId = await this.ensureSession(target.id);
    await this.ensureCapacity(target.capacity, targetSessionId);
    const now = new Date();
    await this.db.update(tableSeats).set({ releasedAt: now }).where(eq(tableSeats.id, seat.id));
    await this.db.insert(tableSeats).values({ id: id("seat"), sessionId: targetSessionId,
      memberProfileId: seat.memberProfileId, guestName: seat.guestName, seatedAt: now });
    await this.endSessionIfEmpty(seat.sourceSessionId);
  }

  public async releaseSeat(organizationId: OrganizationId, seatId: string): Promise<void> {
    const [seat] = await this.db.select({ id: tableSeats.id, sessionId: tableSeats.sessionId })
      .from(tableSeats).innerJoin(tableSessions, eq(tableSessions.id, tableSeats.sessionId))
      .innerJoin(gameTables, eq(gameTables.id, tableSessions.tableId))
      .where(and(eq(tableSeats.id, seatId), eq(gameTables.organizationId, organizationId),
        isNull(tableSeats.releasedAt), isNull(tableSessions.endedAt))).limit(1);
    if (!seat) throw new Error("Seated player not found.");
    await this.db.update(tableSeats).set({ releasedAt: new Date() }).where(eq(tableSeats.id, seat.id));
    await this.endSessionIfEmpty(seat.sessionId);
  }

  public async releaseTable(organizationId: OrganizationId, tableId: string): Promise<void> {
    await this.getActiveTable(organizationId, tableId);
    const [session] = await this.db.select().from(tableSessions)
      .where(and(eq(tableSessions.tableId, tableId), isNull(tableSessions.endedAt))).limit(1);
    if (!session) return;
    const now = new Date();
    await this.db.update(tableSeats).set({ releasedAt: now })
      .where(and(eq(tableSeats.sessionId, session.id), isNull(tableSeats.releasedAt)));
    await this.db.update(tableSessions).set({ endedAt: now }).where(eq(tableSessions.id, session.id));
  }

  public async delete(organizationId: OrganizationId, tableId: string): Promise<void> {
    const table = await this.getActiveTable(organizationId, tableId);
    const [session] = await this.db.select({ id: tableSessions.id }).from(tableSessions)
      .where(and(eq(tableSessions.tableId, table.id), isNull(tableSessions.endedAt))).limit(1);
    if (session) throw new Error("Release the table before deleting it.");
    await this.db.delete(gameTables).where(eq(gameTables.id, table.id));
  }

  private async getActiveTable(organizationId: OrganizationId, tableId: string) {
    const [table] = await this.db.select().from(gameTables)
      .where(and(eq(gameTables.id, tableId), eq(gameTables.organizationId, organizationId),
        eq(gameTables.status, "active"))).limit(1);
    if (!table) throw new Error("Table not found.");
    return table;
  }

  private validateTable(name: string, capacity: number): void {
    if (!name.trim()) throw new Error("Table name is required.");
    if (!Number.isInteger(capacity) || capacity < 1 || capacity > 20) {
      throw new Error("Table capacity must be between 1 and 20.");
    }
  }

  private async ensureSession(tableId: string): Promise<string> {
    const [current] = await this.db.select({ id: tableSessions.id }).from(tableSessions)
      .where(and(eq(tableSessions.tableId, tableId), isNull(tableSessions.endedAt))).limit(1);
    if (current) return current.id;
    const sessionId = id("session");
    await this.db.insert(tableSessions).values({ id: sessionId, tableId });
    return sessionId;
  }

  private async ensureCapacity(capacity: number, sessionId: string): Promise<void> {
    const [row] = await this.db.select({ count: sql<number>`count(*)` }).from(tableSeats)
      .where(and(eq(tableSeats.sessionId, sessionId), isNull(tableSeats.releasedAt)));
    if (Number(row?.count ?? 0) >= capacity) throw new Error("That table is at capacity.");
  }

  private async endSessionIfEmpty(sessionId: string): Promise<void> {
    const [row] = await this.db.select({ count: sql<number>`count(*)` }).from(tableSeats)
      .where(and(eq(tableSeats.sessionId, sessionId), isNull(tableSeats.releasedAt)));
    if (Number(row?.count ?? 0) === 0) {
      await this.db.update(tableSessions).set({ endedAt: new Date() }).where(eq(tableSessions.id, sessionId));
    }
  }
}
