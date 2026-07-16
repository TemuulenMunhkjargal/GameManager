import { and, eq, sql } from "drizzle-orm";
import type { OrganizationId } from "../../../domain/organizations/organization";
import type { DashboardQueries, DashboardSummaryDTO } from "../../../application/dashboard/ports";
import type { EventQueries } from "../../../application/events/ports";
import type { Database } from "../client";
import { memberProfiles } from "../schema";

export class DrizzleDashboardQueries implements DashboardQueries {
  public constructor(
    private readonly db: Database,
    private readonly eventQueries: EventQueries,
  ) {}

  public async getSummary(organizationId: OrganizationId): Promise<DashboardSummaryDTO> {
    const [events, activeMemberRow] = await Promise.all([
      this.eventQueries.listForOrganization(organizationId),
      this.db
        .select({ count: sql<number>`count(*)` })
        .from(memberProfiles)
        .where(and(
          eq(memberProfiles.organizationId, organizationId),
          eq(memberProfiles.status, "active"),
        ))
        .limit(1),
    ]);
    const now = new Date();

    const upcoming = events.filter((event) => event.status !== "cancelled" && new Date(event.endsAt) >= now);
    const revenueInCents = upcoming.reduce(
      (total, event) => total + event.entryFeeInCents * event.confirmedCount,
      0,
    );

    return {
      upcomingEvents: upcoming,
      activeMemberCount: Number(activeMemberRow[0]?.count ?? 0),
      revenueInCents,
    };
  }
}
