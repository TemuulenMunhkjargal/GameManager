import { eq, inArray } from "drizzle-orm";
import type { OrganizationId } from "../../../domain/organizations/organization";
import type { DashboardQueries, DashboardSummaryDTO } from "../../../application/dashboard/ports";
import type { EventQueries } from "../../../application/events/ports";
import type { Database } from "../client";
import { memberProfiles, registrations } from "../schema";

export class DrizzleDashboardQueries implements DashboardQueries {
  public constructor(
    private readonly db: Database,
    private readonly eventQueries: EventQueries,
  ) {}

  public async getSummary(organizationId: OrganizationId): Promise<DashboardSummaryDTO> {
    const events = await this.eventQueries.listForOrganization(organizationId);
    const now = new Date();

    const members = await this.db
      .select({ id: memberProfiles.id, status: memberProfiles.status })
      .from(memberProfiles)
      .where(eq(memberProfiles.organizationId, organizationId));

    const memberIds = members.map((member) => member.id);

    const memberRegistrations = memberIds.length
      ? await this.db
          .select({ status: registrations.status })
          .from(registrations)
          .where(inArray(registrations.memberProfileId, memberIds))
      : [];

    const confirmedSeats = memberRegistrations.filter(
      (registration) => registration.status === "confirmed" || registration.status === "checked_in",
    ).length;
    const checkedInSeats = memberRegistrations.filter(
      (registration) => registration.status === "checked_in",
    ).length;

    const upcoming = events.filter((event) => event.status !== "cancelled" && new Date(event.endsAt) >= now);
    const revenueInCents = upcoming.reduce(
      (total, event) => total + event.entryFeeInCents * event.confirmedCount,
      0,
    );

    return {
      upcomingEvents: upcoming.length,
      activeMembers: members.filter((member) => member.status === "active").length,
      confirmedSeats,
      checkedInSeats,
      revenueInCents,
      nextEvent: upcoming[0] ?? null,
    };
  }
}
