import { describe, expect, it } from "vitest";
import {
  calculateStandings,
  normalizedTopCut,
  roundRobinRounds,
  seededEliminationRound,
  swissPairingRound,
  type CompetitionSnapshot,
  type LeagueMatchRecord,
  type LeagueStandingRecord,
} from "../../src/domain/leagues/league-competition";

const participantIds = (count: number) => Array.from({ length: count }, (_, index) => `p${index + 1}`);

function standings(ids: string[]): LeagueStandingRecord[] {
  return ids.map((id, index) => ({ participantId: id, memberProfileId: `m${index}`, memberName: id, rank: index + 1, seed: index + 1, status: "active", played: 0, wins: 0, losses: 0, draws: 0, byes: 0, points: ids.length - index, opponentWinPercentage: 0, rating: 1000 }));
}

function completedMatch(id: string, ids: string[], outcomes: Array<"win" | "loss" | "draw" | "bye">, stage: LeagueMatchRecord["stage"] = "swiss", roundId = "round"): LeagueMatchRecord {
  return { id, leagueId: "league", roundId, sequence: 1, stage, status: "completed", label: id, completedAt: new Date(), createdAt: new Date(), entries: ids.map((participantId, index) => ({ id: `${id}_${index}`, matchId: id, participantId, score: null, placement: null, outcome: outcomes[index] })) };
}

function snapshotFor(ids: string[], matches: LeagueMatchRecord[]): CompetitionSnapshot {
  return {
    participants: ids.map((id, index) => ({ id, leagueId: "league", memberProfileId: `m${index}`, memberName: id, seed: index + 1, status: "active", enrolledAt: new Date() })),
    rounds: [],
    matches,
    adjustments: [],
  };
}

describe("league competition engine", () => {
  it("generates a complete round robin with one fair bye per odd-player round", () => {
    const rounds = roundRobinRounds(participantIds(5));
    expect(rounds).toHaveLength(5);
    const pairs = rounds.flatMap((round) => round.pairings.filter((pairing) => pairing.participantIds.length === 2).map((pairing) => [...pairing.participantIds].sort().join(":")));
    expect(new Set(pairs).size).toBe(10);
    expect(rounds.every((round) => round.pairings.filter((pairing) => pairing.participantIds.length === 1).length === 1)).toBe(true);
  });

  it("mirrors every pairing in the second leg of a double round robin", () => {
    const rounds = roundRobinRounds(participantIds(4), 2);
    expect(rounds).toHaveLength(6);
    for (let index = 0; index < 3; index += 1) {
      expect(rounds[index + 3].pairings.map((pairing) => pairing.participantIds)).toEqual(rounds[index].pairings.map((pairing) => [...pairing.participantIds].reverse()));
    }
  });

  it.each([[5, 3], [6, 2], [7, 1]])("seeds %i entrants into a power-of-two bracket with %i byes", (count, byes) => {
    const round = seededEliminationRound(1, participantIds(count), "upper", "Opening bracket");
    expect(round.pairings.filter((pairing) => pairing.participantIds.length === 1)).toHaveLength(byes);
    expect(round.pairings.flatMap((pairing) => pairing.participantIds).sort()).toEqual(participantIds(count).sort());
  });

  it("normalizes a requested Top 6 to the supported Top 4 power of two", () => {
    expect(normalizedTopCut(6, 12)).toBe(4);
    expect(normalizedTopCut(16, 7)).toBe(4);
    expect(normalizedTopCut(4, 1)).toBe(1);
  });

  it("avoids a Swiss rematch when a repeat-free pairing exists", () => {
    const ids = participantIds(4);
    const previous = [completedMatch("m1", ["p1", "p2"], ["win", "loss"]), completedMatch("m2", ["p3", "p4"], ["win", "loss"])];
    const round = swissPairingRound(2, standings(ids), previous);
    const pairs = round.pairings.map((pairing) => [...pairing.participantIds].sort().join(":"));
    expect(pairs).not.toContain("p1:p2");
    expect(pairs).not.toContain("p3:p4");
  });

  it("allows an unavoidable Swiss rematch", () => {
    const previous = [completedMatch("m1", ["p1", "p2"], ["win", "loss"])];
    expect(swissPairingRound(2, standings(["p1", "p2"]), previous).pairings[0].participantIds).toEqual(["p1", "p2"]);
  });

  it("assigns a repeat bye only after players with fewer byes", () => {
    const ids = participantIds(5);
    const previous = [completedMatch("bye", ["p5"], ["bye"])];
    const bye = swissPairingRound(2, standings(ids), previous).pairings.find((pairing) => pairing.participantIds.length === 1)!;
    expect(bye.participantIds[0]).toBe("p4");
  });

  it("derives standings from match history and audited adjustments", () => {
    const snapshot: CompetitionSnapshot = {
      participants: ["p1", "p2"].map((id, index) => ({ id, leagueId: "league", memberProfileId: `m${index}`, memberName: id, seed: index + 1, status: "active", enrolledAt: new Date() })),
      rounds: [],
      matches: [completedMatch("m1", ["p1", "p2"], ["win", "loss"])],
      adjustments: [{ id: "a1", leagueId: "league", participantId: "p2", wins: 0, losses: 0, draws: 0, points: 2, reason: "Sportsmanship", createdAt: new Date() }],
    };
    expect(calculateStandings("match_play", snapshot).map((standing) => ({ id: standing.participantId, wins: standing.wins, losses: standing.losses, points: standing.points }))).toEqual([
      { id: "p1", wins: 1, losses: 0, points: 3 },
      { id: "p2", wins: 0, losses: 1, points: 2 },
    ]);
    snapshot.matches[0] = completedMatch("m1", ["p1", "p2"], ["loss", "win"]);
    expect(calculateStandings("match_play", snapshot)[0].participantId).toBe("p2");
  });

  it("does not let a bye inflate opponent match-win percentage", () => {
    const snapshot: CompetitionSnapshot = {
      participants: ["p1", "p2", "p3"].map((id, index) => ({ id, leagueId: "league", memberProfileId: `m${index}`, memberName: id, seed: index + 1, status: "active", enrolledAt: new Date() })),
      rounds: [],
      matches: [completedMatch("bye", ["p1"], ["bye"]), completedMatch("m1", ["p1", "p2"], ["loss", "win"])],
      adjustments: [],
    };
    const p2 = calculateStandings("swiss", snapshot).find((standing) => standing.participantId === "p2")!;
    expect(p2.opponentWinPercentage).toBeCloseTo(0.33);
  });

  it("scores Swiss byes but not round-robin rests or elimination advancement", () => {
    const bye = completedMatch("bye", ["p1"], ["bye"]);
    expect(calculateStandings("swiss", snapshotFor(["p1"], [bye]))[0]).toMatchObject({ wins: 1, byes: 1, played: 0, points: 3 });
    expect(calculateStandings("round_robin", snapshotFor(["p1"], [{ ...bye, stage: "regular" }]))[0]).toMatchObject({ wins: 0, byes: 1, played: 0, points: 0 });
    expect(calculateStandings("single_elimination", snapshotFor(["p1"], [{ ...bye, stage: "upper" }]))[0]).toMatchObject({ wins: 0, byes: 1, played: 0, points: 0 });
  });

  it("marks Swiss Top Cut non-qualifiers and playoff losers without counting Swiss losses as elimination", () => {
    const semifinal = completedMatch("semi", ["p1", "p2"], ["win", "loss"], "top_cut", "r4");
    const snapshot = snapshotFor(["p1", "p2", "p3", "p4"], [
      completedMatch("swiss-loss", ["p3", "p4"], ["loss", "win"], "swiss", "r1"),
      semifinal,
    ]);
    snapshot.rounds = [{ id: "r4", leagueId: "league", number: 4, stage: "top_cut", status: "completed", label: "Final", completedAt: new Date(), matches: [semifinal] }];
    const active = calculateStandings("swiss_top_cut", snapshot);
    expect(active.find((standing) => standing.participantId === "p1")?.status).toBe("active");
    expect(active.find((standing) => standing.participantId === "p2")?.status).toBe("eliminated");
    expect(active.find((standing) => standing.participantId === "p3")?.status).toBe("eliminated");
    expect(active.find((standing) => standing.participantId === "p4")?.status).toBe("eliminated");
    expect(calculateStandings("swiss_top_cut", snapshot, true)[0]).toMatchObject({ participantId: "p1", status: "champion" });
  });
});
