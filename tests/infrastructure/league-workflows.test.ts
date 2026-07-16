import Sqlite from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  AwardLeaguePointsUseCase,
  CompleteLeagueUseCase,
  CreateLeagueUseCase,
  EnrollLeagueParticipantUseCase,
  RecordLeagueMatchUseCase,
  RecordLeaguePodUseCase,
  RemoveLeagueParticipantUseCase,
  StartLeagueUseCase,
  VoidLeagueMatchUseCase,
} from "../../src/application/leagues/create-league";
import { League } from "../../src/domain/leagues/league";
import { MemberProfile } from "../../src/domain/members/member-profile";
import { initializeDatabase } from "../../src/infrastructure/db/initialize";
import { DrizzleLeagueRepository } from "../../src/infrastructure/db/repositories/league-repository";
import { DrizzleMemberRepository } from "../../src/infrastructure/db/repositories/member-repository";
import * as schema from "../../src/infrastructure/db/schema";

describe("league competition workflows", () => {
  let sqlite: Sqlite.Database;
  let sequence: number;

  beforeEach(() => {
    sqlite = new Sqlite(":memory:");
    sqlite.pragma("foreign_keys = ON");
    initializeDatabase(sqlite);
    sequence = 0;
  });
  afterEach(() => sqlite.close());

  async function setup(format: "match_play" | "round_robin" | "swiss_top_cut" | "single_elimination" | "double_elimination" | "free_for_all", count: number) {
    const db = drizzle(sqlite, { schema });
    const members = new DrizzleMemberRepository(db);
    const leagues = new DrizzleLeagueRepository(db, (prefix) => `${prefix}_${++sequence}`);
    await leagues.save(new League("league_1", "org_mana_vault", null, "Chess", "Test League", "", format, "draft", null, null));
    const enroll = new EnrollLeagueParticipantUseCase(leagues, leagues, members, () => `participant_${++sequence}`);
    for (let index = 1; index <= count; index += 1) {
      const memberId = `member_${index}`;
      await members.save(new MemberProfile(memberId, "org_mana_vault", null, `Player ${index}`, null, null, "Chess", "active"));
      expect((await enroll.execute({ organizationId: "org_mana_vault", leagueId: "league_1", memberProfileId: memberId })).ok).toBe(true);
    }
    expect((await new StartLeagueUseCase(leagues, leagues).execute({ organizationId: "org_mana_vault", leagueId: "league_1" })).ok).toBe(true);
    return { leagues, record: new RecordLeagueMatchUseCase(leagues, leagues) };
  }

  it("rejects invalid league dates before they reach SQLite", async () => {
    const leagues = new DrizzleLeagueRepository(drizzle(sqlite, { schema }), (prefix) => `${prefix}_${++sequence}`);
    const result = await new CreateLeagueUseCase(leagues, () => "league_bad").execute({
      organizationId: "org_mana_vault",
      name: "Broken dates",
      gameSystemLabel: "Chess",
      format: "match_play",
      description: "",
      startsAt: new Date("not-a-date"),
      endsAt: null,
    });
    expect(result).toEqual({ ok: false, error: "League dates are invalid." });
    expect(await leagues.findById("league_bad", "org_mana_vault")).toBeNull();
  });

  it("keeps exactly one active round when correcting an earlier round-robin result", async () => {
    const { leagues, record } = await setup("round_robin", 3);
    let detail = (await leagues.getDetail("league_1", "org_mana_vault"))!;
    const firstMatch = detail.rounds[0].matches.find((match) => match.entries.length === 2)!;
    const winner = firstMatch.entries[0].participantId;
    const partialScore = await record.execute({ organizationId: "org_mana_vault", leagueId: "league_1", matchId: firstMatch.id, winnerParticipantId: winner, draw: false, scores: { [winner]: 2 } });
    expect(partialScore).toEqual({ ok: false, error: "Provide a score for both players or leave both scores blank." });
    expect((await record.execute({ organizationId: "org_mana_vault", leagueId: "league_1", matchId: firstMatch.id, winnerParticipantId: winner, draw: false })).ok).toBe(true);
    detail = (await leagues.getDetail("league_1", "org_mana_vault"))!;
    expect(detail.rounds.filter((round) => round.status === "active").map((round) => round.number)).toEqual([2]);

    const correctedWinner = firstMatch.entries[1].participantId;
    expect((await record.execute({ organizationId: "org_mana_vault", leagueId: "league_1", matchId: firstMatch.id, winnerParticipantId: correctedWinner, draw: false })).ok).toBe(true);
    detail = (await leagues.getDetail("league_1", "org_mana_vault"))!;
    expect(detail.rounds.filter((round) => round.status === "active").map((round) => round.number)).toEqual([2]);
    expect(detail.standings.reduce((points, standing) => points + standing.points, 0)).toBe(3);
  });

  it("withdraws an active player from a flexible league without deleting their roster history", async () => {
    const { leagues } = await setup("match_play", 2);
    let detail = (await leagues.getDetail("league_1", "org_mana_vault"))!;
    const participant = detail.participants[0];
    expect(participant.canRemove).toBe(true);
    const result = await new RemoveLeagueParticipantUseCase(leagues, leagues).execute({
      organizationId: "org_mana_vault",
      leagueId: "league_1",
      participantId: participant.id,
    });
    expect(result.ok).toBe(true);
    detail = (await leagues.getDetail("league_1", "org_mana_vault"))!;
    expect(detail.participantCount).toBe(1);
    expect(detail.participants.find((item) => item.id === participant.id)).toMatchObject({ status: "withdrawn", canRemove: false });
    expect(detail.standings.at(-1)).toMatchObject({ participantId: participant.id, status: "withdrawn" });
  });

  it("runs a four-player double-elimination bracket through a required reset and records the real champion", async () => {
    const { leagues, record } = await setup("double_elimination", 4);
    const context = { organizationId: "org_mana_vault", leagueId: "league_1" } as const;
    const recordWinner = async (matchId: string, participantId: string) => {
      const result = await record.execute({ ...context, matchId, winnerParticipantId: participantId, draw: false });
      expect(result.ok).toBe(true);
    };

    let detail = (await leagues.getDetail("league_1", "org_mana_vault"))!;
    const opening = detail.rounds[0].matches;
    const upperFinalists: string[] = [];
    const openingLosers: string[] = [];
    for (const match of opening) {
      const winner = match.entries[0].participantId;
      upperFinalists.push(winner);
      openingLosers.push(match.entries[1].participantId);
      await recordWinner(match.id, winner);
    }

    detail = (await leagues.getDetail("league_1", "org_mana_vault"))!;
    const second = detail.rounds.find((round) => round.number === 2)!;
    expect(second.matches.map((match) => match.stage).sort()).toEqual(["lower", "upper"]);
    const upper = second.matches.find((match) => match.stage === "upper")!;
    const lower = second.matches.find((match) => match.stage === "lower")!;
    const winnersChampion = upperFinalists[0];
    const lowerSurvivor = openingLosers[0];
    await recordWinner(upper.id, winnersChampion);
    await recordWinner(lower.id, lowerSurvivor);

    detail = (await leagues.getDetail("league_1", "org_mana_vault"))!;
    const crossover = detail.rounds.find((round) => round.number === 3)!.matches[0];
    const previousPairs = new Set(opening.map((match) => match.entries.map((entry) => entry.participantId).sort().join(":")));
    expect(previousPairs.has(crossover.entries.map((entry) => entry.participantId).sort().join(":"))).toBe(false);
    await recordWinner(crossover.id, lowerSurvivor);

    detail = (await leagues.getDetail("league_1", "org_mana_vault"))!;
    const grandFinal = detail.rounds.find((round) => round.number === 4)!.matches[0];
    expect(grandFinal.stage).toBe("final");
    await recordWinner(grandFinal.id, lowerSurvivor);

    detail = (await leagues.getDetail("league_1", "org_mana_vault"))!;
    const reset = detail.rounds.find((round) => round.number === 5)!.matches[0];
    expect(detail.rounds.find((round) => round.number === 5)?.label).toBe("Grand final reset");
    await recordWinner(reset.id, winnersChampion);

    const completed = await new CompleteLeagueUseCase(leagues, leagues).execute(context);
    expect(completed.ok).toBe(true);
    detail = (await leagues.getDetail("league_1", "org_mana_vault"))!;
    expect(detail.championParticipantId).toBe(winnersChampion);
    expect(detail.standings[0]).toMatchObject({ participantId: winnersChampion, status: "champion" });
    expect(detail.standings.filter((standing) => standing.status === "active")).toHaveLength(0);
  });

  it.each([3, 5, 8])("completes a %i-player double-elimination bracket without stranding a stage", async (count) => {
    const { leagues, record } = await setup("double_elimination", count);
    const context = { organizationId: "org_mana_vault", leagueId: "league_1" } as const;
    for (let guard = 0; guard < 30; guard += 1) {
      const detail = (await leagues.getDetail("league_1", "org_mana_vault"))!;
      const active = detail.rounds.find((round) => round.status === "active");
      if (!active) break;
      const scheduled = active.matches.filter((match) => match.status === "scheduled");
      expect(scheduled.length, `round ${active.number} must contain a playable match`).toBeGreaterThan(0);
      for (const match of scheduled) {
        expect((await record.execute({ ...context, matchId: match.id, winnerParticipantId: match.entries[0].participantId, draw: false })).ok).toBe(true);
      }
    }
    const completed = await new CompleteLeagueUseCase(leagues, leagues).execute(context);
    expect(completed.ok).toBe(true);
    const detail = (await leagues.getDetail("league_1", "org_mana_vault"))!;
    expect(detail.championParticipantId).not.toBeNull();
    expect(detail.unresolvedMatchCount).toBe(0);
  });

  it.each([3, 5, 8])("completes a seeded %i-player single-elimination bracket", async (count) => {
    const { leagues, record } = await setup("single_elimination", count);
    const context = { organizationId: "org_mana_vault", leagueId: "league_1" } as const;
    for (let guard = 0; guard < 10; guard += 1) {
      const detail = (await leagues.getDetail("league_1", "org_mana_vault"))!;
      const active = detail.rounds.find((round) => round.status === "active");
      if (!active) break;
      for (const match of active.matches.filter((item) => item.status === "scheduled")) {
        expect((await record.execute({ ...context, matchId: match.id, winnerParticipantId: match.entries[0].participantId, draw: false })).ok).toBe(true);
      }
    }
    expect((await new CompleteLeagueUseCase(leagues, leagues).execute(context)).ok).toBe(true);
    const detail = (await leagues.getDetail("league_1", "org_mana_vault"))!;
    expect(detail.standings[0].status).toBe("champion");
    expect(detail.rounds.at(-1)?.stage).toBe("final");
  });

  it("runs Swiss rounds without rematches, seeds a Top 4, and completes the playoff", async () => {
    const { leagues, record } = await setup("swiss_top_cut", 8);
    const context = { organizationId: "org_mana_vault", leagueId: "league_1" } as const;
    const swissPairs = new Set<string>();
    for (let guard = 0; guard < 10; guard += 1) {
      const detail = (await leagues.getDetail("league_1", "org_mana_vault"))!;
      const active = detail.rounds.find((round) => round.status === "active");
      if (!active) break;
      for (const match of active.matches.filter((item) => item.status === "scheduled")) {
        if (match.stage === "swiss") {
          const pair = match.entries.map((entry) => entry.participantId).sort().join(":");
          expect(swissPairs.has(pair)).toBe(false);
          swissPairs.add(pair);
        }
        expect((await record.execute({ ...context, matchId: match.id, winnerParticipantId: match.entries[0].participantId, draw: false })).ok).toBe(true);
      }
    }
    const beforeCompletion = (await leagues.getDetail("league_1", "org_mana_vault"))!;
    const topCutEntrants = new Set(beforeCompletion.rounds.filter((round) => round.stage === "top_cut" || round.stage === "final")
      .flatMap((round) => round.matches.flatMap((match) => match.entries.map((entry) => entry.participantId))));
    expect(topCutEntrants.size).toBe(4);
    expect(beforeCompletion.standings.filter((standing) => standing.status === "eliminated").length).toBeGreaterThanOrEqual(7);
    expect((await new CompleteLeagueUseCase(leagues, leagues).execute(context)).ok).toBe(true);
    expect((await leagues.getDetail("league_1", "org_mana_vault"))!.standings[0].status).toBe("champion");
  });

  it("corrects and voids pod results while rejecting aggregate point shortcuts", async () => {
    const { leagues } = await setup("free_for_all", 3);
    const context = { organizationId: "org_mana_vault", leagueId: "league_1" } as const;
    const participants = (await leagues.getDetail("league_1", "org_mana_vault"))!.participants;
    const pod = new RecordLeaguePodUseCase(leagues, leagues);
    const first = await pod.execute({ ...context, entries: participants.map((participant, index) => ({ participantId: participant.id, placement: index + 1, points: 3 - index })) });
    expect(first.ok).toBe(true);
    if (!first.ok) throw new Error(first.error);
    expect((await pod.execute({ ...context, matchId: first.value.matchId, entries: [...participants].reverse().map((participant, index) => ({ participantId: participant.id, placement: index + 1, points: 5 - index })) })).ok).toBe(true);
    expect((await leagues.getDetail("league_1", "org_mana_vault"))!.standings[0].participantId).toBe(participants[2].id);
    expect((await new AwardLeaguePointsUseCase(leagues, leagues, () => "adjustment_1").execute({ ...context, participantId: participants[0].id, points: 5, reason: "Shortcut" })).ok).toBe(false);
    expect((await new VoidLeagueMatchUseCase(leagues, leagues).execute({ ...context, matchId: first.value.matchId })).ok).toBe(true);
    expect((await leagues.getDetail("league_1", "org_mana_vault"))!.standings.every((standing) => standing.points === 0)).toBe(true);
    expect((await new CompleteLeagueUseCase(leagues, leagues).execute(context)).ok).toBe(false);
  });
});
