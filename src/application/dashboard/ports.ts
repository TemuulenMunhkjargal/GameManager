import type { EventSummaryDTO } from "../events/ports";
import type { OrganizationId } from "../../domain/organizations/organization";

export type DashboardSummaryDTO = {
  upcomingEvents: EventSummaryDTO[];
  activeMemberCount: number;
  revenueInCents: number;
};

export interface DashboardQueries {
  getSummary(organizationId: OrganizationId): Promise<DashboardSummaryDTO>;
}
