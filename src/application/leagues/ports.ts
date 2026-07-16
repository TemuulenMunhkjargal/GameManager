import type { League, LeagueFormat, LeagueId, LeagueStatus } from "../../domain/leagues/league";
import type {
  CompetitionSnapshot,
  GeneratedRound,
  LeagueMatchOutcome,
  LeagueMatchRecord,
  LeagueParticipantRecord,
  LeagueRoundRecord,
  LeagueStandingRecord,
  LeagueStatAdjustmentRecord,
} from "../../domain/leagues/league-competition";
import type { OrganizationId } from "../../domain/organizations/organization";

export interface LeagueRepository {
  findById(leagueId: LeagueId, organizationId: OrganizationId): Promise<League | null>;
  save(league: League): Promise<void>;
  delete(leagueId: LeagueId, organizationId: OrganizationId): Promise<boolean>;
}

export type LeagueParticipantDTO = LeagueParticipantRecord & {
  canRemove: boolean;
};

export type LeagueMatchEntryDTO = {
  id: string;
  participantId: string;
  memberName: string;
  score: number | null;
  placement: number | null;
  outcome: LeagueMatchOutcome | null;
};

export type LeagueMatchDTO = Omit<LeagueMatchRecord, "entries"> & {
  entries: LeagueMatchEntryDTO[];
  canEdit: boolean;
};

export type LeagueRoundDTO = Omit<LeagueRoundRecord, "matches"> & {
  matches: LeagueMatchDTO[];
};

export type LeagueAdjustmentDTO = LeagueStatAdjustmentRecord & {
  memberName: string;
  canDelete: boolean;
};

export type LeagueStandingDTO = LeagueStandingRecord;

export type LeagueSummaryDTO = {
  id: LeagueId;
  name: string;
  gameSystemLabel: string;
  description: string;
  format: LeagueFormat;
  status: LeagueStatus;
  startsAt: string | null;
  endsAt: string | null;
  configuredRounds: number;
  topCutSize: number;
  participantCount: number;
  participants: LeagueParticipantDTO[];
  standings: LeagueStandingDTO[];
  rounds: LeagueRoundDTO[];
  ungroupedMatches: LeagueMatchDTO[];
  adjustments: LeagueAdjustmentDTO[];
  unresolvedMatchCount: number;
  phase: string;
  championParticipantId: string | null;
};

export interface LeagueCompetitionRepository {
  getSnapshot(leagueId: LeagueId): Promise<CompetitionSnapshot>;
  addParticipant(input: {
    id: string;
    leagueId: LeagueId;
    memberProfileId: string;
    seed: number;
  }): Promise<void>;
  removeParticipant(participantId: string, leagueId: LeagueId): Promise<boolean>;
  withdrawParticipant(participantId: string, leagueId: LeagueId): Promise<boolean>;
  saveGeneratedRounds(leagueId: LeagueId, rounds: GeneratedRound[], activateFirst: boolean): Promise<void>;
  recordMatchResult(input: {
    leagueId: LeagueId;
    matchId: string;
    entries: Array<{
      participantId: string;
      score: number | null;
      placement: number | null;
      outcome: LeagueMatchOutcome;
    }>;
  }): Promise<void>;
  createCompletedMatch(input: {
    leagueId: LeagueId;
    stage: LeagueMatchRecord["stage"];
    label: string;
    entries: Array<{
      participantId: string;
      score: number | null;
      placement: number | null;
      outcome: LeagueMatchOutcome;
    }>;
  }): Promise<string>;
  resetMatch(leagueId: LeagueId, matchId: string): Promise<void>;
  voidMatch(leagueId: LeagueId, matchId: string): Promise<void>;
  rewindToRound(leagueId: LeagueId, roundId: string, roundNumber: number): Promise<void>;
  completeRound(roundId: string, nextRound: GeneratedRound | null): Promise<void>;
  addAdjustment(input: {
    id: string;
    leagueId: LeagueId;
    participantId: string;
    wins?: number;
    losses?: number;
    draws?: number;
    points: number;
    reason: string;
  }): Promise<void>;
  deleteAdjustment(adjustmentId: string, leagueId: LeagueId): Promise<boolean>;
}

export interface LeagueQueries {
  listForOrganization(organizationId: OrganizationId): Promise<LeagueSummaryDTO[]>;
  getDetail(leagueId: LeagueId, organizationId: OrganizationId): Promise<LeagueSummaryDTO | null>;
}
