import { and, asc, count, desc, eq, inArray } from "drizzle-orm";
import { League, type LeagueId } from "../../../domain/leagues/league";
import {
  calculateStandings,
  winnersFromRound,
  type CompetitionSnapshot,
  type GeneratedRound,
  type LeagueMatchEntryRecord,
  type LeagueMatchRecord,
  type LeagueParticipantRecord,
  type LeagueRoundRecord,
} from "../../../domain/leagues/league-competition";
import type { OrganizationId } from "../../../domain/organizations/organization";
import type {
  LeagueCompetitionRepository,
  LeagueQueries,
  LeagueRepository,
  LeagueSummaryDTO,
} from "../../../application/leagues/ports";
import type { Database } from "../client";
import {
  leagueMatchEntries,
  leagueMatches,
  leagueParticipants,
  leagueRounds,
  leagues,
  leagueStatAdjustments,
  memberProfiles,
} from "../schema";

type ParticipantRow = LeagueParticipantRecord;

export class DrizzleLeagueRepository implements LeagueRepository, LeagueQueries, LeagueCompetitionRepository {
  public constructor(
    private readonly db: Database,
    private readonly createId: (prefix: string) => string,
  ) {}

  public async findById(leagueId: LeagueId, organizationId: OrganizationId): Promise<League | null> {
    const [row] = await this.db.select().from(leagues)
      .where(and(eq(leagues.id, leagueId), eq(leagues.organizationId, organizationId))).limit(1);
    return row ? this.toLeague(row) : null;
  }

  public async save(league: League): Promise<void> {
    const values = {
      id: league.id,
      organizationId: league.organizationId,
      gameSystemId: league.gameSystemId,
      gameSystemLabel: league.gameSystemLabel,
      name: league.name,
      description: league.description,
      format: league.format,
      status: league.status,
      startsAt: league.startsAt,
      endsAt: league.endsAt,
      configuredRounds: league.configuredRounds,
      topCutSize: league.topCutSize,
    };
    const [existing] = await this.db.select({ id: leagues.id }).from(leagues).where(eq(leagues.id, league.id)).limit(1);
    if (existing) {
      await this.db.update(leagues).set(values).where(eq(leagues.id, league.id));
    } else {
      await this.db.insert(leagues).values(values);
    }
  }

  public async delete(leagueId: LeagueId, organizationId: OrganizationId): Promise<boolean> {
    const deleted = await this.db.delete(leagues)
      .where(and(eq(leagues.id, leagueId), eq(leagues.organizationId, organizationId)))
      .returning({ id: leagues.id });
    return deleted.length > 0;
  }

  public async addParticipant(input: { id: string; leagueId: string; memberProfileId: string; seed: number }): Promise<void> {
    await this.db.insert(leagueParticipants).values({ ...input, status: "active" });
  }

  public async removeParticipant(participantId: string, leagueId: string): Promise<boolean> {
    const deleted = await this.db.delete(leagueParticipants)
      .where(and(eq(leagueParticipants.id, participantId), eq(leagueParticipants.leagueId, leagueId)))
      .returning({ id: leagueParticipants.id });
    return deleted.length > 0;
  }

  public async withdrawParticipant(participantId: string, leagueId: string): Promise<boolean> {
    const updated = await this.db.update(leagueParticipants).set({ status: "withdrawn" })
      .where(and(eq(leagueParticipants.id, participantId), eq(leagueParticipants.leagueId, leagueId)))
      .returning({ id: leagueParticipants.id });
    return updated.length > 0;
  }

  public async getSnapshot(leagueId: string): Promise<CompetitionSnapshot> {
    const [participants, roundRows, matchRows, entryRows, adjustmentRows] = await Promise.all([
      this.loadParticipants([leagueId]),
      this.db.select().from(leagueRounds).where(eq(leagueRounds.leagueId, leagueId)).orderBy(asc(leagueRounds.number)),
      this.db.select().from(leagueMatches).where(eq(leagueMatches.leagueId, leagueId)).orderBy(asc(leagueMatches.createdAt), asc(leagueMatches.sequence)),
      this.db.select({
        id: leagueMatchEntries.id,
        matchId: leagueMatchEntries.matchId,
        participantId: leagueMatchEntries.participantId,
        score: leagueMatchEntries.score,
        placement: leagueMatchEntries.placement,
        outcome: leagueMatchEntries.outcome,
      }).from(leagueMatchEntries)
        .innerJoin(leagueMatches, eq(leagueMatches.id, leagueMatchEntries.matchId))
        .where(eq(leagueMatches.leagueId, leagueId)),
      this.db.select().from(leagueStatAdjustments)
        .where(eq(leagueStatAdjustments.leagueId, leagueId)).orderBy(desc(leagueStatAdjustments.createdAt)),
    ]);
    return this.assembleSnapshot(
      leagueId,
      participants,
      roundRows,
      matchRows,
      entryRows,
      adjustmentRows,
    );
  }

  public async saveGeneratedRounds(leagueId: string, generated: GeneratedRound[], activateFirst: boolean): Promise<void> {
    this.db.transaction((tx) => {
      if (activateFirst) tx.update(leagues).set({ status: "active" }).where(eq(leagues.id, leagueId)).run();
      generated.forEach((round, roundIndex) => {
        const roundId = this.createId("league_round");
        const hasScheduledMatch = round.pairings.some((pairing) => pairing.participantIds.length > 1);
        const status = activateFirst && roundIndex === 0 ? (hasScheduledMatch ? "active" : "completed") : "pending";
        tx.insert(leagueRounds).values({
          id: roundId,
          leagueId,
          number: round.number,
          stage: round.stage,
          status,
          label: round.label,
          completedAt: status === "completed" ? new Date() : null,
        }).run();
        round.pairings.forEach((pairing, sequence) => {
          const matchId = this.createId("league_match");
          const bye = pairing.participantIds.length === 1;
          tx.insert(leagueMatches).values({
            id: matchId,
            leagueId,
            roundId,
            sequence: sequence + 1,
            stage: pairing.stage ?? round.stage,
            status: bye ? "completed" : "scheduled",
            label: bye ? "Bye" : `Table ${sequence + 1}`,
            completedAt: bye ? new Date() : null,
          }).run();
          if (pairing.participantIds.length > 0) {
            tx.insert(leagueMatchEntries).values(pairing.participantIds.map((participantId) => ({
              id: this.createId("league_entry"),
              matchId,
              participantId,
              score: null,
              placement: null,
              outcome: bye ? "bye" as const : null,
            }))).run();
          }
        });
      });
    });
  }

  public async recordMatchResult(input: {
    leagueId: string;
    matchId: string;
    entries: Array<{ participantId: string; score: number | null; placement: number | null; outcome: "win" | "loss" | "draw" | "bye" | "placed" | "participated" }>;
  }): Promise<void> {
    this.db.transaction((tx) => {
      const match = tx.select({ id: leagueMatches.id }).from(leagueMatches)
        .where(and(eq(leagueMatches.id, input.matchId), eq(leagueMatches.leagueId, input.leagueId))).get();
      if (!match) throw new Error("Match not found.");
      tx.delete(leagueMatchEntries).where(eq(leagueMatchEntries.matchId, input.matchId)).run();
      tx.insert(leagueMatchEntries).values(input.entries.map((entry) => ({
        id: this.createId("league_entry"),
        matchId: input.matchId,
        ...entry,
      }))).run();
      tx.update(leagueMatches).set({ status: "completed", completedAt: new Date() })
        .where(eq(leagueMatches.id, input.matchId)).run();
    });
  }

  public async createCompletedMatch(input: {
    leagueId: string;
    stage: LeagueMatchRecord["stage"];
    label: string;
    entries: Array<{ participantId: string; score: number | null; placement: number | null; outcome: "win" | "loss" | "draw" | "bye" | "placed" | "participated" }>;
  }): Promise<string> {
    const id = this.createId("league_match");
    this.db.transaction((tx) => {
      const sequence = tx.select({ value: count() }).from(leagueMatches)
        .where(eq(leagueMatches.leagueId, input.leagueId)).get()!.value + 1;
      tx.insert(leagueMatches).values({
        id,
        leagueId: input.leagueId,
        roundId: null,
        sequence,
        stage: input.stage,
        status: "completed",
        label: input.label,
        completedAt: new Date(),
      }).run();
      tx.insert(leagueMatchEntries).values(input.entries.map((entry) => ({
        id: this.createId("league_entry"),
        matchId: id,
        ...entry,
      }))).run();
    });
    return id;
  }

  public async resetMatch(leagueId: string, matchId: string): Promise<void> {
    this.db.transaction((tx) => {
      const match = tx.select({ id: leagueMatches.id }).from(leagueMatches)
        .where(and(eq(leagueMatches.id, matchId), eq(leagueMatches.leagueId, leagueId))).get();
      if (!match) throw new Error("Match not found.");
      tx.update(leagueMatchEntries).set({ score: null, placement: null, outcome: null })
        .where(eq(leagueMatchEntries.matchId, matchId)).run();
      tx.update(leagueMatches).set({ status: "scheduled", completedAt: null })
        .where(eq(leagueMatches.id, matchId)).run();
    });
  }

  public async voidMatch(leagueId: string, matchId: string): Promise<void> {
    const updated = await this.db.update(leagueMatches).set({ status: "void", completedAt: null })
      .where(and(eq(leagueMatches.id, matchId), eq(leagueMatches.leagueId, leagueId)))
      .returning({ id: leagueMatches.id });
    if (!updated.length) throw new Error("Match not found.");
  }

  public async rewindToRound(leagueId: string, roundId: string, roundNumber: number): Promise<void> {
    this.db.transaction((tx) => {
      const laterRounds = tx.select({ id: leagueRounds.id, number: leagueRounds.number }).from(leagueRounds)
        .where(eq(leagueRounds.leagueId, leagueId)).all()
        .filter((round) => round.number > roundNumber);
      if (laterRounds.length) tx.delete(leagueRounds).where(inArray(leagueRounds.id, laterRounds.map((round) => round.id))).run();
      tx.update(leagueRounds).set({ status: "active", completedAt: null }).where(eq(leagueRounds.id, roundId)).run();
    });
  }

  public async completeRound(roundId: string, nextRound: GeneratedRound | null): Promise<void> {
    const current = await this.db.select({ leagueId: leagueRounds.leagueId }).from(leagueRounds)
      .where(eq(leagueRounds.id, roundId)).limit(1);
    if (!current[0]) throw new Error("Round not found.");
    this.db.transaction((tx) => {
      const round = tx.select({ status: leagueRounds.status }).from(leagueRounds)
        .where(eq(leagueRounds.id, roundId)).get();
      if (!round || round.status === "completed") return;
      tx.update(leagueRounds).set({ status: "completed", completedAt: new Date() })
        .where(eq(leagueRounds.id, roundId)).run();
      if (nextRound) {
        this.insertGeneratedRound(tx, current[0].leagueId, nextRound, true);
        return;
      }
      const pending = tx.select({ id: leagueRounds.id }).from(leagueRounds)
        .where(and(eq(leagueRounds.leagueId, current[0].leagueId), eq(leagueRounds.status, "pending")))
        .orderBy(asc(leagueRounds.number)).get();
      if (pending) tx.update(leagueRounds).set({ status: "active" }).where(eq(leagueRounds.id, pending.id)).run();
    });
  }

  public async addAdjustment(input: {
    id: string;
    leagueId: string;
    participantId: string;
    wins?: number;
    losses?: number;
    draws?: number;
    points: number;
    reason: string;
  }): Promise<void> {
    await this.db.insert(leagueStatAdjustments).values({
      ...input,
      wins: input.wins ?? 0,
      losses: input.losses ?? 0,
      draws: input.draws ?? 0,
    });
  }

  public async deleteAdjustment(adjustmentId: string, leagueId: string): Promise<boolean> {
    const deleted = await this.db.delete(leagueStatAdjustments)
      .where(and(eq(leagueStatAdjustments.id, adjustmentId), eq(leagueStatAdjustments.leagueId, leagueId)))
      .returning({ id: leagueStatAdjustments.id });
    return deleted.length > 0;
  }

  public async listForOrganization(organizationId: OrganizationId): Promise<LeagueSummaryDTO[]> {
    const rows = await this.db.select().from(leagues)
      .where(eq(leagues.organizationId, organizationId)).orderBy(desc(leagues.createdAt));
    if (rows.length === 0) return [];
    const ids = rows.map((row) => row.id);
    const [participants, roundRows, matchRows, entryRows, adjustmentRows] = await Promise.all([
      this.loadParticipants(ids),
      this.db.select().from(leagueRounds).where(inArray(leagueRounds.leagueId, ids)).orderBy(asc(leagueRounds.number)),
      this.db.select().from(leagueMatches).where(inArray(leagueMatches.leagueId, ids)).orderBy(asc(leagueMatches.createdAt), asc(leagueMatches.sequence)),
      this.db.select({
        id: leagueMatchEntries.id,
        matchId: leagueMatchEntries.matchId,
        participantId: leagueMatchEntries.participantId,
        score: leagueMatchEntries.score,
        placement: leagueMatchEntries.placement,
        outcome: leagueMatchEntries.outcome,
        leagueId: leagueMatches.leagueId,
      }).from(leagueMatchEntries)
        .innerJoin(leagueMatches, eq(leagueMatches.id, leagueMatchEntries.matchId))
        .where(inArray(leagueMatches.leagueId, ids)),
      this.db.select().from(leagueStatAdjustments)
        .where(inArray(leagueStatAdjustments.leagueId, ids)).orderBy(desc(leagueStatAdjustments.createdAt)),
    ]);
    return rows.map((row) => this.toDTO(row, this.assembleSnapshot(
      row.id,
      participants,
      roundRows,
      matchRows,
      entryRows,
      adjustmentRows,
    )));
  }

  public async getDetail(leagueId: LeagueId, organizationId: OrganizationId): Promise<LeagueSummaryDTO | null> {
    const [row] = await this.db.select().from(leagues)
      .where(and(eq(leagues.id, leagueId), eq(leagues.organizationId, organizationId))).limit(1);
    if (!row) return null;
    return this.toDTO(row, await this.getSnapshot(leagueId));
  }

  private toLeague(row: typeof leagues.$inferSelect): League {
    return new League(
      row.id,
      row.organizationId,
      row.gameSystemId,
      row.gameSystemLabel,
      row.name,
      row.description,
      row.format,
      row.status,
      row.startsAt,
      row.endsAt,
      row.configuredRounds,
      row.topCutSize,
    );
  }

  private async loadParticipants(leagueIds: string[]): Promise<ParticipantRow[]> {
    if (leagueIds.length === 0) return [];
    return this.db.select({
      id: leagueParticipants.id,
      leagueId: leagueParticipants.leagueId,
      memberProfileId: leagueParticipants.memberProfileId,
      memberName: memberProfiles.displayName,
      seed: leagueParticipants.seed,
      status: leagueParticipants.status,
      enrolledAt: leagueParticipants.enrolledAt,
    }).from(leagueParticipants)
      .innerJoin(memberProfiles, eq(memberProfiles.id, leagueParticipants.memberProfileId))
      .where(inArray(leagueParticipants.leagueId, leagueIds))
      .orderBy(asc(leagueParticipants.seed));
  }

  private assembleSnapshot(
    leagueId: string,
    allParticipants: ParticipantRow[],
    allRounds: Array<typeof leagueRounds.$inferSelect>,
    allMatches: Array<typeof leagueMatches.$inferSelect>,
    allEntries: Array<typeof leagueMatchEntries.$inferSelect & { leagueId?: string }>,
    allAdjustments: Array<typeof leagueStatAdjustments.$inferSelect>,
  ): CompetitionSnapshot {
    const entriesByMatch = new Map<string, LeagueMatchEntryRecord[]>();
    for (const entry of allEntries) {
      entriesByMatch.set(entry.matchId, [...(entriesByMatch.get(entry.matchId) ?? []), {
        id: entry.id,
        matchId: entry.matchId,
        participantId: entry.participantId,
        score: entry.score,
        placement: entry.placement,
        outcome: entry.outcome,
      }]);
    }
    const matches = allMatches.filter((match) => match.leagueId === leagueId).map((match): LeagueMatchRecord => ({
      id: match.id,
      leagueId: match.leagueId,
      roundId: match.roundId,
      sequence: match.sequence,
      stage: match.stage,
      status: match.status,
      label: match.label,
      completedAt: match.completedAt,
      createdAt: match.createdAt,
      entries: entriesByMatch.get(match.id) ?? [],
    }));
    const matchesByRound = new Map<string, LeagueMatchRecord[]>();
    for (const match of matches) {
      if (match.roundId) matchesByRound.set(match.roundId, [...(matchesByRound.get(match.roundId) ?? []), match]);
    }
    const rounds = allRounds.filter((round) => round.leagueId === leagueId).map((round): LeagueRoundRecord => ({
      id: round.id,
      leagueId: round.leagueId,
      number: round.number,
      stage: round.stage,
      status: round.status,
      label: round.label,
      completedAt: round.completedAt,
      matches: matchesByRound.get(round.id) ?? [],
    }));
    return {
      participants: allParticipants.filter((participant) => participant.leagueId === leagueId),
      rounds,
      matches,
      adjustments: allAdjustments.filter((adjustment) => adjustment.leagueId === leagueId).map((adjustment) => ({
        ...adjustment,
        wins: adjustment.wins,
        losses: adjustment.losses,
        draws: adjustment.draws,
        points: adjustment.points,
        reason: adjustment.reason,
        createdAt: adjustment.createdAt,
      })),
    };
  }

  private toDTO(row: typeof leagues.$inferSelect, snapshot: CompetitionSnapshot): LeagueSummaryDTO {
    const standings = calculateStandings(row.format, snapshot, row.status === "completed");
    const names = new Map(snapshot.participants.map((participant) => [participant.id, participant.memberName]));
    const roundStatuses = new Map(snapshot.rounds.map((round) => [round.id, round.status]));
    const matchDTO = (match: LeagueMatchRecord) => ({
      ...match,
      entries: match.entries.map((entry) => ({ ...entry, memberName: names.get(entry.participantId) ?? "Unknown player" })),
      canEdit: row.status === "active" && match.status !== "void" && match.entries.length > 1 &&
        (!match.roundId || roundStatuses.get(match.roundId) !== "pending" || match.status === "completed"),
    });
    const elimination = row.format === "single_elimination" || row.format === "double_elimination" || row.format === "swiss_top_cut";
    const terminalRound = [...snapshot.rounds]
      .filter((round) => round.status === "completed" && winnersFromRound(round).length === 1)
      .sort((a, b) => b.number - a.number)[0];
    const bracketChampion = terminalRound ? winnersFromRound(terminalRound)[0] : null;
    const championParticipantId = row.status === "completed"
      ? elimination ? bracketChampion : standings[0]?.participantId ?? null
      : null;
    if (championParticipantId) {
      const champion = standings.find((standing) => standing.participantId === championParticipantId);
      if (champion) champion.status = "champion";
    }
    const activeRound = snapshot.rounds.find((round) => round.status === "active");
    const phase = row.status === "draft" ? "Roster setup" : row.status === "completed" ? "Completed" :
      activeRound?.stage === "top_cut" ? "Top Cut" : activeRound?.stage === "swiss" ? "Swiss rounds" :
        (activeRound?.stage === "upper" || activeRound?.stage === "lower") && row.format === "double_elimination" ? "Double-elimination bracket" :
          activeRound?.stage === "upper" ? "Elimination bracket" :
          activeRound?.stage === "final" ? "Final" : activeRound ? activeRound.label : "Open competition";
    return {
      id: row.id,
      name: row.name,
      gameSystemLabel: row.gameSystemLabel,
      description: row.description,
      format: row.format,
      status: row.status,
      startsAt: row.startsAt?.toISOString() ?? null,
      endsAt: row.endsAt?.toISOString() ?? null,
      configuredRounds: row.configuredRounds,
      topCutSize: row.topCutSize,
      participantCount: snapshot.participants.filter((participant) => participant.status === "active").length,
      participants: snapshot.participants.map((participant) => ({
        ...participant,
        canRemove: participant.status === "active" && (
          row.status === "draft" && !snapshot.matches.some((match) => match.entries.some((entry) => entry.participantId === participant.id)) ||
          row.status === "active" && ["match_play", "ladder", "free_for_all", "points_series", "campaign", "open_play"].includes(row.format)
        ),
      })),
      standings,
      rounds: snapshot.rounds.map((round) => ({ ...round, matches: round.matches.map(matchDTO) })),
      ungroupedMatches: snapshot.matches.filter((match) => !match.roundId).map(matchDTO),
      adjustments: snapshot.adjustments.map((adjustment) => ({
        ...adjustment,
        memberName: names.get(adjustment.participantId) ?? "Unknown player",
        canDelete: row.status === "active" && !adjustment.reason.startsWith("Imported from"),
      })),
      unresolvedMatchCount: snapshot.matches.filter((match) => match.status === "scheduled").length,
      phase,
      championParticipantId,
    };
  }

  private insertGeneratedRound(
    tx: Parameters<Parameters<Database["transaction"]>[0]>[0],
    leagueId: string,
    round: GeneratedRound,
    active: boolean,
  ): void {
    const roundId = this.createId("league_round");
    const hasScheduledMatch = round.pairings.some((pairing) => pairing.participantIds.length > 1);
    tx.insert(leagueRounds).values({
      id: roundId,
      leagueId,
      number: round.number,
      stage: round.stage,
      status: active && hasScheduledMatch ? "active" : hasScheduledMatch ? "pending" : "completed",
      label: round.label,
      completedAt: hasScheduledMatch ? null : new Date(),
    }).run();
    round.pairings.forEach((pairing, sequence) => {
      const matchId = this.createId("league_match");
      const bye = pairing.participantIds.length === 1;
      tx.insert(leagueMatches).values({
        id: matchId,
        leagueId,
        roundId,
        sequence: sequence + 1,
        stage: pairing.stage ?? round.stage,
        status: bye ? "completed" : "scheduled",
        label: bye ? "Bye" : `Table ${sequence + 1}`,
        completedAt: bye ? new Date() : null,
      }).run();
      if (pairing.participantIds.length) tx.insert(leagueMatchEntries).values(pairing.participantIds.map((participantId) => ({
        id: this.createId("league_entry"), matchId, participantId, outcome: bye ? "bye" as const : null,
      }))).run();
    });
  }
}
