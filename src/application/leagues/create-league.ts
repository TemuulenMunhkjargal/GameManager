import { League } from "../../domain/leagues/league";
import type { LeagueFormat, LeagueId } from "../../domain/leagues/league";
import {
  calculateStandings,
  nextDoubleEliminationRound,
  normalizedTopCut,
  recommendedSwissRounds,
  roundRobinRounds,
  seededEliminationRound,
  swissPairingRound,
  winnersFromRound,
  type CompetitionSnapshot,
  type GeneratedRound,
} from "../../domain/leagues/league-competition";
import type { OrganizationId } from "../../domain/organizations/organization";
import { failure, success, type Result } from "../../domain/shared/result";
import { getLeagueFormat } from "../../lib/league-formats";
import type { MemberRepository } from "../members/ports";
import type { LeagueCompetitionRepository, LeagueRepository } from "./ports";

type CommandContext = {
  organizationId: OrganizationId;
  leagueId: LeagueId;
};

function adjacentAdvancementRound(
  number: number,
  participantIds: string[],
  stage: "top_cut" | "upper" | "final",
): GeneratedRound {
  const pairings = [];
  for (let index = 0; index < participantIds.length; index += 2) {
    pairings.push({ participantIds: participantIds.slice(index, index + 2), stage });
  }
  return {
    number,
    stage,
    label: participantIds.length <= 2 ? "Final" : stage === "top_cut" ? `Top ${participantIds.length}` : `Bracket round ${number}`,
    pairings,
  };
}

export class CreateLeagueUseCase {
  public constructor(private readonly leagues: LeagueRepository, private readonly createId: () => string) {}

  public async execute(cmd: {
    organizationId: OrganizationId;
    name: string;
    description: string;
    gameSystemLabel: string;
    format: LeagueFormat;
    startsAt: Date | null;
    endsAt: Date | null;
    configuredRounds?: number;
    topCutSize?: number;
  }): Promise<Result<League>> {
    const name = cmd.name.trim();
    if (!name) return failure("League name is required.");
    if ((cmd.startsAt && Number.isNaN(cmd.startsAt.getTime())) || (cmd.endsAt && Number.isNaN(cmd.endsAt.getTime()))) return failure("League dates are invalid.");
    if (cmd.startsAt && cmd.endsAt && cmd.endsAt < cmd.startsAt) return failure("The end date must be after the start date.");
    const configuredRounds = cmd.configuredRounds ?? 0;
    if (!Number.isInteger(configuredRounds) || configuredRounds < 0 || configuredRounds > 20) return failure("Rounds must be automatic or from 1 to 20.");
    const topCutSize = cmd.topCutSize ?? 4;
    if (![2, 4, 8, 16].includes(topCutSize)) return failure("Top Cut must be 2, 4, 8, or 16 players.");
    const league = new League(
      this.createId(), cmd.organizationId, null, cmd.gameSystemLabel.trim() || "Other", name,
      cmd.description.trim(), cmd.format, "draft", cmd.startsAt, cmd.endsAt, configuredRounds, topCutSize,
    );
    await this.leagues.save(league);
    return success(league);
  }
}

export class EnrollLeagueParticipantUseCase {
  public constructor(
    private readonly leagues: LeagueRepository,
    private readonly competition: LeagueCompetitionRepository,
    private readonly members: MemberRepository,
    private readonly createId: () => string,
  ) {}

  public async execute(cmd: CommandContext & { memberProfileId: string }): Promise<Result<{ id: string }>> {
    const league = await this.leagues.findById(cmd.leagueId, cmd.organizationId);
    if (!league) return failure("League not found.");
    const policy = getLeagueFormat(league.format);
    if (league.status !== "draft" && !(league.status === "active" && policy.allowsLateEnrollment)) {
      return failure("This format locks its roster when the league starts.");
    }
    const member = await this.members.findById(cmd.memberProfileId);
    if (!member || member.organizationId !== cmd.organizationId || !member.canRegisterForEvents) return failure("Choose an active player.");
    const snapshot = await this.competition.getSnapshot(cmd.leagueId);
    if (snapshot.participants.some((participant) => participant.memberProfileId === cmd.memberProfileId)) return failure("That player is already enrolled.");
    const id = this.createId();
    await this.competition.addParticipant({
      id,
      leagueId: cmd.leagueId,
      memberProfileId: cmd.memberProfileId,
      seed: Math.max(0, ...snapshot.participants.map((participant) => participant.seed)) + 1,
    });
    return success({ id });
  }
}

export class RemoveLeagueParticipantUseCase {
  public constructor(private readonly leagues: LeagueRepository, private readonly competition: LeagueCompetitionRepository) {}
  public async execute(cmd: CommandContext & { participantId: string }): Promise<Result<{ removed: true }>> {
    const league = await this.leagues.findById(cmd.leagueId, cmd.organizationId); if (!league) return failure("League not found.");
    const snapshot = await this.competition.getSnapshot(cmd.leagueId);
    const participant = snapshot.participants.find((item) => item.id === cmd.participantId); if (!participant) return failure("Participant not found.");
    if (league.status === "draft") {
      if (snapshot.matches.some((match) => match.entries.some((entry) => entry.participantId === participant.id))) return failure("A player with match history cannot be removed.");
      await this.competition.removeParticipant(cmd.participantId, cmd.leagueId);
    } else if (league.status === "active" && getLeagueFormat(league.format).allowsLateEnrollment && participant.status === "active") {
      await this.competition.withdrawParticipant(cmd.participantId, cmd.leagueId);
    } else {
      return failure("This league's roster is locked.");
    }
    return success({ removed: true });
  }
}

export class StartLeagueUseCase {
  public constructor(private readonly leagues: LeagueRepository, private readonly competition: LeagueCompetitionRepository) {}
  public async execute(cmd: CommandContext): Promise<Result<League>> {
    const league = await this.leagues.findById(cmd.leagueId, cmd.organizationId); if (!league) return failure("League not found.");
    const started = league.start(); if (!started.ok) return started;
    const snapshot = await this.competition.getSnapshot(cmd.leagueId);
    const active = snapshot.participants.filter((participant) => participant.status === "active").sort((a, b) => a.seed - b.seed);
    const policy = getLeagueFormat(league.format);
    if (active.length < policy.minimumParticipants) return failure(`${policy.label} requires at least ${policy.minimumParticipants} participants.`);
    const ids = active.map((participant) => participant.id);
    let rounds: GeneratedRound[] = [];
    if (league.format === "round_robin") rounds = roundRobinRounds(ids);
    else if (league.format === "double_round_robin") rounds = roundRobinRounds(ids, 2);
    else if (league.format === "swiss" || league.format === "swiss_top_cut") {
      rounds = [swissPairingRound(1, calculateStandings(league.format, snapshot), snapshot.matches)];
    } else if (league.format === "single_elimination") {
      rounds = [seededEliminationRound(1, ids, ids.length <= 2 ? "final" : "upper", ids.length <= 2 ? "Final" : "Opening bracket")];
    } else if (league.format === "double_elimination") {
      rounds = [seededEliminationRound(1, ids, "upper", "Winners bracket · Round 1")];
    }
    await this.competition.saveGeneratedRounds(league.id, rounds, true);
    return success(started.value);
  }
}

export class RecordLeagueMatchUseCase {
  public constructor(
    private readonly leagues: LeagueRepository,
    private readonly competition: LeagueCompetitionRepository,
  ) {}

  public async execute(cmd: CommandContext & {
    matchId: string;
    winnerParticipantId: string | null;
    draw: boolean;
    scores?: Record<string, number>;
  }): Promise<Result<{ matchId: string }>> {
    const league = await this.leagues.findById(cmd.leagueId, cmd.organizationId); if (!league) return failure("League not found.");
    if (league.status !== "active") return failure("Results can only be recorded for active leagues.");
    let snapshot = await this.competition.getSnapshot(cmd.leagueId);
    const match = snapshot.matches.find((item) => item.id === cmd.matchId);
    if (!match || match.status === "void") return failure("Match not found.");
    if (match.entries.length !== 2) return failure("This result requires exactly two players.");
    const participantIds = match.entries.map((entry) => entry.participantId);
    if (!cmd.draw && (!cmd.winnerParticipantId || !participantIds.includes(cmd.winnerParticipantId))) return failure("Choose the match winner or mark a draw.");
    if (cmd.draw && cmd.winnerParticipantId) return failure("A draw cannot also have a winner.");
    if (cmd.draw && (league.format === "single_elimination" || league.format === "double_elimination" || match.stage === "top_cut" || match.stage === "final")) return failure("Elimination matches must have a winner.");
    const scores = cmd.scores ?? {};
    if (Object.values(scores).some((score) => !Number.isInteger(score) || score < 0 || score > 999)) return failure("Scores must be whole numbers from 0 to 999.");
    const suppliedScores = participantIds.map((participantId) => scores[participantId]).filter((score): score is number => score !== undefined);
    if (suppliedScores.length === 1) return failure("Provide a score for both players or leave both scores blank.");
    if (suppliedScores.length === 2) {
      if (cmd.draw && suppliedScores[0] !== suppliedScores[1]) return failure("A drawn match must have equal scores.");
      if (!cmd.draw) {
        const winnerScore = scores[cmd.winnerParticipantId!];
        const loserId = participantIds.find((participantId) => participantId !== cmd.winnerParticipantId)!;
        if (winnerScore <= scores[loserId]) return failure("The winner must have the higher score.");
      }
    }

    const round = match.roundId ? snapshot.rounds.find((item) => item.id === match.roundId) : null;
    const adaptive = league.format === "swiss" || league.format === "swiss_top_cut" || league.format === "single_elimination" || league.format === "double_elimination";
    const wasCompletedNonAdaptiveRound = Boolean(round && round.status === "completed" && !adaptive);
    if (round && adaptive && round.status === "completed") {
      const later = snapshot.rounds.filter((item) => item.number > round.number);
      const hasPlayedDownstream = later.some((item) => item.matches.some((candidate) =>
        candidate.status === "completed" && candidate.entries.length > 1));
      if (hasPlayedDownstream) return failure("Undo later-round results before correcting this match.");
      await this.competition.rewindToRound(cmd.leagueId, round.id, round.number);
    } else if (round && round.status === "pending") {
      return failure("That round has not started yet.");
    }

    await this.competition.recordMatchResult({
      leagueId: cmd.leagueId,
      matchId: cmd.matchId,
      entries: participantIds.map((participantId) => ({
        participantId,
        score: scores[participantId] ?? null,
        placement: null,
        outcome: cmd.draw ? "draw" : participantId === cmd.winnerParticipantId ? "win" : "loss",
      })),
    });
    snapshot = await this.competition.getSnapshot(cmd.leagueId);
    const updatedMatch = snapshot.matches.find((item) => item.id === cmd.matchId)!;
    if (updatedMatch.roundId && !wasCompletedNonAdaptiveRound) await this.advanceIfReady(league, snapshot, updatedMatch.roundId);
    return success({ matchId: cmd.matchId });
  }

  private async advanceIfReady(league: League, snapshot: CompetitionSnapshot, roundId: string): Promise<void> {
    const round = snapshot.rounds.find((item) => item.id === roundId);
    if (!round || round.matches.some((match) => match.status !== "completed")) return;
    let next: GeneratedRound | null = null;
    if (league.format === "swiss" || league.format === "swiss_top_cut") {
      if (round.stage === "swiss") {
        const totalSwiss = league.configuredRounds || recommendedSwissRounds(snapshot.participants.length);
        if (round.number < totalSwiss) {
          next = swissPairingRound(round.number + 1, calculateStandings(league.format, snapshot), snapshot.matches);
        } else if (league.format === "swiss_top_cut") {
          const topCut = normalizedTopCut(league.topCutSize, snapshot.participants.length);
          const qualifiers = calculateStandings(league.format, snapshot).slice(0, topCut).map((standing) => standing.participantId);
          next = seededEliminationRound(round.number + 1, qualifiers, qualifiers.length <= 2 ? "final" : "top_cut", qualifiers.length <= 2 ? "Final" : `Top ${qualifiers.length}`);
        }
      } else {
        const winners = winnersFromRound(round);
        if (winners.length > 1) next = adjacentAdvancementRound(round.number + 1, winners, winners.length <= 2 ? "final" : "top_cut");
      }
    } else if (league.format === "single_elimination") {
      const winners = winnersFromRound(round);
      if (winners.length > 1) next = adjacentAdvancementRound(round.number + 1, winners, winners.length <= 2 ? "final" : "upper");
    } else if (league.format === "double_elimination") {
      next = nextDoubleEliminationRound(round.number + 1, snapshot, round);
    }
    await this.competition.completeRound(round.id, next);
  }
}

export class RecordFlexibleLeagueMatchUseCase {
  public constructor(private readonly leagues: LeagueRepository, private readonly competition: LeagueCompetitionRepository) {}
  public async execute(cmd: CommandContext & { firstParticipantId: string; secondParticipantId: string; winnerParticipantId: string | null; draw: boolean }): Promise<Result<{ matchId: string }>> {
    const league = await this.leagues.findById(cmd.leagueId, cmd.organizationId); if (!league) return failure("League not found.");
    if (league.status !== "active" || !["match_play", "ladder"].includes(league.format)) return failure("This format uses generated pairings or point sessions.");
    if (cmd.firstParticipantId === cmd.secondParticipantId) return failure("Choose two different participants.");
    if (cmd.draw && cmd.winnerParticipantId) return failure("A draw cannot also have a winner.");
    const snapshot = await this.competition.getSnapshot(cmd.leagueId);
    const activeIds = snapshot.participants.filter((participant) => participant.status === "active").map((participant) => participant.id);
    if (!activeIds.includes(cmd.firstParticipantId) || !activeIds.includes(cmd.secondParticipantId)) return failure("Choose two active league participants.");
    if (!cmd.draw && ![cmd.firstParticipantId, cmd.secondParticipantId].includes(cmd.winnerParticipantId ?? "")) return failure("Choose a winner or mark a draw.");
    if (league.format === "ladder") {
      const standings = calculateStandings(league.format, snapshot);
      const distance = Math.abs(standings.findIndex((item) => item.participantId === cmd.firstParticipantId) - standings.findIndex((item) => item.participantId === cmd.secondParticipantId));
      if (distance > 3) return failure("Ladder challenges must be within three ranking positions.");
    }
    const matchId = await this.competition.createCompletedMatch({
      leagueId: cmd.leagueId,
      stage: "regular",
      label: league.format === "ladder" ? "Ladder challenge" : "Scheduled matchup",
      entries: [cmd.firstParticipantId, cmd.secondParticipantId].map((participantId) => ({
        participantId, score: null, placement: null,
        outcome: cmd.draw ? "draw" : participantId === cmd.winnerParticipantId ? "win" : "loss",
      })),
    });
    return success({ matchId });
  }
}

export class RecordLeaguePodUseCase {
  public constructor(private readonly leagues: LeagueRepository, private readonly competition: LeagueCompetitionRepository) {}
  public async execute(cmd: CommandContext & { matchId?: string; entries: Array<{ participantId: string; placement: number; points: number }> }): Promise<Result<{ matchId: string }>> {
    const league = await this.leagues.findById(cmd.leagueId, cmd.organizationId); if (!league) return failure("League not found.");
    if (league.status !== "active" || league.format !== "free_for_all") return failure("Pod results are only available for an active Free-for-All league.");
    if (cmd.entries.length < 3 || cmd.entries.length > 20) return failure("A pod requires 3 to 20 players.");
    if (new Set(cmd.entries.map((entry) => entry.participantId)).size !== cmd.entries.length) return failure("Each pod player can appear only once.");
    if (new Set(cmd.entries.map((entry) => entry.placement)).size !== cmd.entries.length || cmd.entries.some((entry) => !Number.isInteger(entry.placement) || entry.placement < 1 || entry.placement > cmd.entries.length)) return failure("Placements must be unique and cover the pod from first to last.");
    if (cmd.entries.some((entry) => !Number.isInteger(entry.points) || entry.points < -100 || entry.points > 100)) return failure("Pod points must be whole numbers from -100 to 100.");
    const snapshot = await this.competition.getSnapshot(cmd.leagueId);
    const active = new Set(snapshot.participants.filter((participant) => participant.status === "active").map((participant) => participant.id));
    if (cmd.entries.some((entry) => !active.has(entry.participantId))) return failure("Every pod player must be actively enrolled.");
    if (cmd.matchId) {
      const existing = snapshot.matches.find((match) => match.id === cmd.matchId && !match.roundId && match.stage === "pod");
      if (!existing) return failure("Pod result not found.");
      await this.competition.recordMatchResult({
        leagueId: cmd.leagueId,
        matchId: cmd.matchId,
        entries: cmd.entries.map((entry) => ({ participantId: entry.participantId, score: entry.points, placement: entry.placement, outcome: "placed" })),
      });
      return success({ matchId: cmd.matchId });
    }
    const matchId = await this.competition.createCompletedMatch({
      leagueId: cmd.leagueId,
      stage: "pod",
      label: `Pod ${snapshot.matches.filter((match) => match.stage === "pod").length + 1}`,
      entries: cmd.entries.map((entry) => ({ participantId: entry.participantId, score: entry.points, placement: entry.placement, outcome: "placed" })),
    });
    return success({ matchId });
  }
}

export class AwardLeaguePointsUseCase {
  public constructor(private readonly leagues: LeagueRepository, private readonly competition: LeagueCompetitionRepository, private readonly createId: () => string) {}
  public async execute(cmd: CommandContext & { participantId: string; points: number; reason: string }): Promise<Result<{ id: string; points: number }>> {
    if (!Number.isInteger(cmd.points) || cmd.points < -100 || cmd.points > 100 || cmd.points === 0) return failure("Points must be a non-zero whole number from -100 to 100.");
    if (!cmd.reason.trim()) return failure("Add a reason so the adjustment can be audited later.");
    const league = await this.leagues.findById(cmd.leagueId, cmd.organizationId); if (!league) return failure("League not found.");
    if (league.status !== "active" || getLeagueFormat(league.format).pairingMode !== "points") return failure("This league does not accept direct point awards.");
    const snapshot = await this.competition.getSnapshot(cmd.leagueId);
    if (!snapshot.participants.some((participant) => participant.id === cmd.participantId && participant.status === "active")) return failure("Choose an active league participant.");
    const id = this.createId();
    await this.competition.addAdjustment({ id, leagueId: cmd.leagueId, participantId: cmd.participantId, points: cmd.points, reason: cmd.reason.trim() });
    return success({ id, points: cmd.points });
  }
}

export class DeleteLeagueAdjustmentUseCase {
  public constructor(private readonly leagues: LeagueRepository, private readonly competition: LeagueCompetitionRepository) {}
  public async execute(cmd: CommandContext & { adjustmentId: string }): Promise<Result<{ removed: true }>> {
    const league = await this.leagues.findById(cmd.leagueId, cmd.organizationId); if (!league) return failure("League not found.");
    if (league.status !== "active") return failure("Only active league adjustments can be corrected.");
    const snapshot = await this.competition.getSnapshot(cmd.leagueId);
    const adjustment = snapshot.adjustments.find((item) => item.id === cmd.adjustmentId);
    if (!adjustment || adjustment.reason.startsWith("Imported from")) return failure("That adjustment cannot be removed.");
    await this.competition.deleteAdjustment(cmd.adjustmentId, cmd.leagueId);
    return success({ removed: true });
  }
}

export class VoidLeagueMatchUseCase {
  public constructor(private readonly leagues: LeagueRepository, private readonly competition: LeagueCompetitionRepository) {}
  public async execute(cmd: CommandContext & { matchId: string }): Promise<Result<{ voided: true }>> {
    const league = await this.leagues.findById(cmd.leagueId, cmd.organizationId); if (!league) return failure("League not found.");
    if (league.status !== "active") return failure("Only active league results can be voided.");
    const snapshot = await this.competition.getSnapshot(cmd.leagueId);
    const match = snapshot.matches.find((item) => item.id === cmd.matchId);
    if (!match || match.roundId) return failure("Generated bracket matches cannot be voided; correct their result instead.");
    await this.competition.voidMatch(cmd.leagueId, cmd.matchId);
    return success({ voided: true });
  }
}

export class CompleteLeagueUseCase {
  public constructor(private readonly leagues: LeagueRepository, private readonly competition: LeagueCompetitionRepository) {}
  public async execute(cmd: CommandContext): Promise<Result<League>> {
    const league = await this.leagues.findById(cmd.leagueId, cmd.organizationId); if (!league) return failure("League not found.");
    const completed = league.complete(); if (!completed.ok) return completed;
    const snapshot = await this.competition.getSnapshot(cmd.leagueId);
    if (snapshot.matches.some((match) => match.status === "scheduled")) return failure("Finish every required matchup before completing the league.");
    const structured = ["round_robin", "double_round_robin", "swiss", "swiss_top_cut", "single_elimination", "double_elimination"].includes(league.format);
    if (structured && snapshot.rounds.length === 0) return failure("This competition has no generated rounds.");
    const activeRound = snapshot.rounds.find((round) => round.status !== "completed");
    if (structured && activeRound) return failure("Finish the active competition stage before completing the league.");
    if ((league.format === "swiss" || league.format === "swiss_top_cut") && snapshot.rounds.filter((round) => round.stage === "swiss").length < (league.configuredRounds || recommendedSwissRounds(snapshot.participants.length))) return failure("All configured Swiss rounds must be played.");
    if (["single_elimination", "double_elimination", "swiss_top_cut"].includes(league.format)) {
      const lastRound = [...snapshot.rounds].sort((a, b) => b.number - a.number)[0];
      if (!lastRound || winnersFromRound(lastRound).length !== 1) return failure("The bracket must produce one recorded winner.");
    }
    if (!structured && snapshot.matches.every((match) => match.status !== "completed") && snapshot.adjustments.length === 0) return failure("Record at least one result before completing the league.");
    await this.leagues.save(completed.value);
    return completed;
  }
}
