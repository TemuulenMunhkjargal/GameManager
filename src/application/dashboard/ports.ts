import type { EventSummaryDTO } from "../events/ports";
import type { OrganizationId } from "../../domain/organizations/organization";

export type DashboardSummaryDTO = {
  upcomingEvents: number;
  activeMembers: number;
  confirmedSeats: number;
  checkedInSeats: number;
  revenueInCents: number;
  nextEvent: EventSummaryDTO | null;
};

export interface DashboardQueries {
  getSummary(organizationId: OrganizationId): Promise<DashboardSummaryDTO>;
}
