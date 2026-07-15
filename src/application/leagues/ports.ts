import type { League, LeagueFormat, LeagueId, LeagueStatus } from "../../domain/leagues/league";
import type { LeagueStanding, LeagueStandingId } from "../../domain/leagues/league-standing";
import type { OrganizationId } from "../../domain/organizations/organization";
import type { MemberProfileId } from "../../domain/members/member-profile";

export interface LeagueRepository {
  findById(leagueId: LeagueId, organizationId: OrganizationId): Promise<League | null>;
  save(league: League): Promise<void>;
  delete(leagueId: LeagueId, organizationId: OrganizationId): Promise<boolean>;
}

export interface LeagueStandingRepository {
  findForMember(leagueId: LeagueId, memberProfileId: MemberProfileId): Promise<LeagueStanding | null>;
  save(standing: LeagueStanding): Promise<void>;
}

export type LeagueStandingDTO = {
  id: LeagueStandingId;
  memberName: string;
  wins: number;
  losses: number;
  draws: number;
  bonusPoints: number;
  points: number;
};

export type LeagueSummaryDTO = {
  id: LeagueId;
  name: string;
  gameSystemLabel: string;
  description: string;
  format: LeagueFormat;
  status: LeagueStatus;
  startsAt: string | null;
  endsAt: string | null;
  participantCount: number;
  standings: LeagueStandingDTO[];
};

export interface LeagueQueries {
  listForOrganization(organizationId: OrganizationId): Promise<LeagueSummaryDTO[]>;
  getDetail(leagueId: LeagueId, organizationId: OrganizationId): Promise<LeagueSummaryDTO | null>;
}
