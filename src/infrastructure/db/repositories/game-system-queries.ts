import { and, eq } from "drizzle-orm";
import type { OrganizationId } from "../../../domain/organizations/organization";
import type { GameSystemQueries, GameSystemSummaryDTO } from "../../../application/game-systems/ports";
import type { Database } from "../client";
import { events, gameSystems } from "../schema";

export class DrizzleGameSystemQueries implements GameSystemQueries {
  public constructor(private readonly db: Database) {}

  public async listForOrganization(organizationId: OrganizationId): Promise<GameSystemSummaryDTO[]> {
    const rows = await this.db
      .select()
      .from(gameSystems)
      .where(eq(gameSystems.organizationId, organizationId));

    const summaries = await Promise.all(
      rows.map(async (row) => {
        const activeEvents = await this.db
          .select({ id: events.id })
          .from(events)
          .where(
            and(
              eq(events.organizationId, organizationId),
              eq(events.gameSystemLabel, row.name),
              eq(events.status, "published"),
            ),
          );

        return {
          id: row.id,
          name: row.name,
          slug: row.slug,
          type: row.type,
          defaultCapacity: row.defaultCapacity,
          activeEventCount: activeEvents.length,
          notes: row.notes,
        };
      }),
    );

    return summaries.sort((first, second) => first.name.localeCompare(second.name));
  }
}
