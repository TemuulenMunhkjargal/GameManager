import { and, eq, isNull, or, sql } from "drizzle-orm";
import { GameSystem, type GameSystemId } from "../../../domain/game-systems/game-system";
import type { OrganizationId } from "../../../domain/organizations/organization";
import type {
  GameSystemQueries,
  GameSystemRepository,
  GameSystemSummaryDTO,
} from "../../../application/game-systems/ports";
import type { Database } from "../client";
import { events, gameSystems } from "../schema";

export class DrizzleGameSystemQueries implements GameSystemQueries, GameSystemRepository {
  public constructor(private readonly db: Database) {}

  public async findById(gameSystemId: GameSystemId, organizationId: OrganizationId): Promise<GameSystem | null> {
    const [row] = await this.db
      .select()
      .from(gameSystems)
      .where(and(eq(gameSystems.id, gameSystemId), eq(gameSystems.organizationId, organizationId)))
      .limit(1);

    if (!row) return null;

    return new GameSystem(
      row.id,
      row.organizationId,
      row.name,
      row.slug,
      row.type,
      row.defaultCapacity,
      row.notes,
      row.status,
    );
  }

  public async save(gameSystem: GameSystem): Promise<void> {
    const values = {
      id: gameSystem.id,
      organizationId: gameSystem.organizationId,
      name: gameSystem.name,
      slug: gameSystem.slug,
      type: gameSystem.type,
      defaultCapacity: gameSystem.defaultCapacity,
      notes: gameSystem.notes,
      status: gameSystem.status,
    };

    await this.db
      .insert(gameSystems)
      .values(values)
      .onConflictDoUpdate({ target: gameSystems.id, set: values });
  }

  public async listForOrganization(
    organizationId: OrganizationId,
    options?: { includeArchived?: boolean },
  ): Promise<GameSystemSummaryDTO[]> {
    const rows = await this.db
      .select({
        id: gameSystems.id,
        organizationId: gameSystems.organizationId,
        name: gameSystems.name,
        slug: gameSystems.slug,
        type: gameSystems.type,
        defaultCapacity: gameSystems.defaultCapacity,
        notes: gameSystems.notes,
        status: gameSystems.status,
        activeEventCount: sql<number>`count(${events.id})`,
      })
      .from(gameSystems)
      .leftJoin(events, and(
        eq(events.organizationId, organizationId),
        eq(events.status, "published"),
        or(
          eq(events.gameSystemId, gameSystems.id),
          and(isNull(events.gameSystemId), eq(events.gameSystemLabel, gameSystems.name)),
        ),
      ))
      .where(
        options?.includeArchived
          ? eq(gameSystems.organizationId, organizationId)
          : and(eq(gameSystems.organizationId, organizationId), eq(gameSystems.status, "active")),
      )
      .groupBy(gameSystems.id);

    return rows
      .map((row) => ({ ...row, activeEventCount: Number(row.activeEventCount) }))
      .sort((first, second) => first.name.localeCompare(second.name));
  }
}
