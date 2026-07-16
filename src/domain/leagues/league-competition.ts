import type { LeagueFormat, LeagueId } from "./league";

export type LeagueParticipantStatus = "active" | "withdrawn";
export type LeagueRoundStage =
  | "regular"
  | "swiss"
  | "top_cut"
  | "upper"
  | "lower"
  | "final"
  | "pod"
  | "series"
  | "campaign"
  | "open";
export type LeagueRoundStatus = "pending" | "active" | "completed";
export type LeagueMatchStatus = "scheduled" | "completed" | "void";
export type LeagueMatchOutcome = "win" | "loss" | "draw" | "bye" | "placed" | "participated";

export type LeagueParticipantRecord = {
  id: string;
  leagueId: LeagueId;
  memberProfileId: string;
  memberName: string;
  seed: number;
  status: LeagueParticipantStatus;
  enrolledAt: Date;
};

export type LeagueMatchEntryRecord = {
  id: string;
  matchId: string;
  participantId: string;
  score: number | null;
  placement: number | null;
  outcome: LeagueMatchOutcome | null;
};

export type LeagueMatchRecord = {
  id: string;
  leagueId: LeagueId;
  roundId: string | null;
  sequence: number;
  stage: LeagueRoundStage;
  status: LeagueMatchStatus;
  label: string;
  completedAt: Date | null;
  createdAt: Date;
  entries: LeagueMatchEntryRecord[];
};

export type LeagueRoundRecord = {
  id: string;
  leagueId: LeagueId;
  number: number;
  stage: LeagueRoundStage;
  status: LeagueRoundStatus;
  label: string;
  completedAt: Date | null;
  matches: LeagueMatchRecord[];
};

export type LeagueStatAdjustmentRecord = {
  id: string;
  leagueId: LeagueId;
  participantId: string;
  wins: number;
  losses: number;
  draws: number;
  points: number;
  reason: string;
  createdAt: Date;
};

export type LeagueStandingRecord = {
  participantId: string;
  memberProfileId: string;
  memberName: string;
  rank: number;
  seed: number;
  status: "active" | "withdrawn" | "eliminated" | "champion";
  played: number;
  wins: number;
  losses: number;
  draws: number;
  byes: number;
  points: number;
  opponentWinPercentage: number;
  rating: number;
};

export type GeneratedPairing = {
  participantIds: string[];
  stage?: LeagueRoundStage;
};

export type GeneratedRound = {
  number: number;
  stage: LeagueRoundStage;
  label: string;
  pairings: GeneratedPairing[];
};

export type CompetitionSnapshot = {
  participants: LeagueParticipantRecord[];
  rounds: LeagueRoundRecord[];
  matches: LeagueMatchRecord[];
  adjustments: LeagueStatAdjustmentRecord[];
};

export function recommendedSwissRounds(participantCount: number): number {
  if (participantCount <= 8) return 3;
  if (participantCount <= 16) return 4;
  if (participantCount <= 32) return 5;
  if (participantCount <= 64) return 6;
  return 7;
}

export function normalizedTopCut(requested: number, participantCount: number): number {
  const maximum = Math.min(16, participantCount);
  if (maximum < 2) return maximum;
  const requestedLimit = Math.min(maximum, Math.max(2, requested || 4));
  let size = 2;
  while (size * 2 <= requestedLimit) size *= 2;
  return size;
}

export function roundRobinRounds(participantIds: string[], repeats = 1): GeneratedRound[] {
  const rotation: Array<string | null> = [...participantIds];
  if (rotation.length % 2 !== 0) rotation.push(null);
  if (rotation.length < 2) return [];

  const firstLeg: GeneratedPairing[][] = [];
  for (let round = 0; round < rotation.length - 1; round += 1) {
    const pairings: GeneratedPairing[] = [];
    for (let index = 0; index < rotation.length / 2; index += 1) {
      const left = rotation[index];
      const right = rotation[rotation.length - 1 - index];
      if (left && right) pairings.push({ participantIds: [left, right] });
      else pairings.push({ participantIds: [left ?? right].filter((id): id is string => Boolean(id)) });
    }
    firstLeg.push(pairings);
    const last = rotation.pop()!;
    rotation.splice(1, 0, last);
  }

  const result: GeneratedRound[] = [];
  for (let leg = 0; leg < repeats; leg += 1) {
    for (let index = 0; index < firstLeg.length; index += 1) {
      const number = result.length + 1;
      const pairings = firstLeg[index].map((pairing) => ({
        participantIds: leg % 2 === 0 ? [...pairing.participantIds] : [...pairing.participantIds].reverse(),
      }));
      result.push({
        number,
        stage: "regular",
        label: repeats > 1 ? `Round ${number} · Leg ${leg + 1}` : `Round ${number}`,
        pairings,
      });
    }
  }
  return result;
}

function completedHeadToHead(matches: LeagueMatchRecord[]): LeagueMatchRecord[] {
  return matches.filter((match) => match.status === "completed" && match.entries.length >= 2 &&
    match.entries.every((entry) => entry.outcome !== "placed" && entry.outcome !== "participated"));
}

export function calculateStandings(
  format: LeagueFormat,
  snapshot: CompetitionSnapshot,
  leagueCompleted = false,
): LeagueStandingRecord[] {
  const base = new Map(snapshot.participants.map((participant) => [participant.id, {
    participantId: participant.id,
    memberProfileId: participant.memberProfileId,
    memberName: participant.memberName,
    rank: 0,
    seed: participant.seed,
    status: (participant.status === "withdrawn" ? "withdrawn" : "active") as LeagueStandingRecord["status"],
    played: 0,
    wins: 0,
    losses: 0,
    draws: 0,
    byes: 0,
    points: 0,
    opponentWinPercentage: 0,
    rating: 1000,
  }]));
  const opponents = new Map<string, string[]>();
  const scoredByes = new Map<string, number>();

  const orderedMatches = [...snapshot.matches]
    .filter((match) => match.status === "completed")
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime() || a.sequence - b.sequence);

  for (const match of orderedMatches) {
    const activeEntries = match.entries.filter((entry) => base.has(entry.participantId));
    if (activeEntries.length === 1 && activeEntries[0].outcome === "bye") {
      const standing = base.get(activeEntries[0].participantId)!;
      standing.byes += 1;
      // Swiss awards a match win for a bye. Round-robin rests and bracket
      // advancement byes are not games played and must not inflate standings.
      if (match.stage === "swiss" && (format === "swiss" || format === "swiss_top_cut")) {
        standing.wins += 1;
        standing.points += 3;
        scoredByes.set(standing.participantId, (scoredByes.get(standing.participantId) ?? 0) + 1);
      }
      continue;
    }

    if (activeEntries.length === 2 && activeEntries.every((entry) => entry.outcome !== "placed" && entry.outcome !== "participated")) {
      const [leftEntry, rightEntry] = activeEntries;
      const left = base.get(leftEntry.participantId)!;
      const right = base.get(rightEntry.participantId)!;
      left.played += 1;
      right.played += 1;
      opponents.set(left.participantId, [...(opponents.get(left.participantId) ?? []), right.participantId]);
      opponents.set(right.participantId, [...(opponents.get(right.participantId) ?? []), left.participantId]);

      if (leftEntry.outcome === "draw" || rightEntry.outcome === "draw") {
        left.draws += 1; right.draws += 1; left.points += 1; right.points += 1;
      } else {
        const winner = leftEntry.outcome === "win" ? left : right;
        const loser = winner === left ? right : left;
        winner.wins += 1; winner.points += 3; loser.losses += 1;
      }

      const expectedLeft = 1 / (1 + 10 ** ((right.rating - left.rating) / 400));
      const actualLeft = leftEntry.outcome === "draw" ? 0.5 : leftEntry.outcome === "win" ? 1 : 0;
      const delta = Math.round(32 * (actualLeft - expectedLeft));
      left.rating += delta;
      right.rating -= delta;
      continue;
    }

    for (const entry of activeEntries) {
      const standing = base.get(entry.participantId)!;
      standing.played += 1;
      standing.points += entry.score ?? 0;
      if (entry.placement === 1 || entry.outcome === "win") standing.wins += 1;
      else if (entry.outcome === "draw") standing.draws += 1;
      else if (entry.placement || entry.outcome === "loss") standing.losses += 1;
    }
  }

  for (const adjustment of snapshot.adjustments) {
    const standing = base.get(adjustment.participantId);
    if (!standing) continue;
    standing.wins += adjustment.wins;
    standing.losses += adjustment.losses;
    standing.draws += adjustment.draws;
    standing.played += adjustment.wins + adjustment.losses + adjustment.draws;
    standing.points += adjustment.points;
  }

  for (const standing of base.values()) {
    const opponentRecords = (opponents.get(standing.participantId) ?? []).map((id) => base.get(id)).filter(Boolean);
    standing.opponentWinPercentage = opponentRecords.length === 0 ? 0 :
      opponentRecords.reduce((sum, opponent) => {
        const matchWins = opponent!.wins - (scoredByes.get(opponent!.participantId) ?? 0);
        const games = matchWins + opponent!.losses + opponent!.draws;
        return sum + (games === 0 ? 0.33 : Math.max(0.33, (matchWins + opponent!.draws * 0.5) / games));
      }, 0) / opponentRecords.length;
  }

  const roundNumbers = new Map(snapshot.rounds.map((round) => [round.id, round.number]));
  const playoffStages = new Set<LeagueRoundStage>(["top_cut", "final"]);
  const playoffMatches = orderedMatches.filter((match) => playoffStages.has(match.stage));
  const exitRound = new Map<string, number>();

  if (format === "single_elimination" || format === "double_elimination") {
    const lossLimit = format === "single_elimination" ? 1 : 2;
    for (const standing of base.values()) {
      if (standing.status !== "withdrawn" && standing.losses >= lossLimit) standing.status = "eliminated";
    }
  } else if (format === "swiss_top_cut" && playoffMatches.length > 0) {
    const playoffParticipants = new Set(playoffMatches.flatMap((match) => match.entries.map((entry) => entry.participantId)));
    for (const standing of base.values()) {
      if (standing.status !== "withdrawn" && !playoffParticipants.has(standing.participantId)) standing.status = "eliminated";
    }
    for (const match of playoffMatches) {
      for (const entry of match.entries) {
        if (entry.outcome === "loss") base.get(entry.participantId)!.status = "eliminated";
      }
    }
  }

  if (format === "single_elimination" || format === "double_elimination" || format === "swiss_top_cut") {
    const relevant = format === "swiss_top_cut"
      ? playoffMatches
      : orderedMatches.filter((match) => match.stage === "upper" || match.stage === "lower" || match.stage === "final");
    for (const match of relevant) {
      const number = match.roundId ? roundNumbers.get(match.roundId) ?? 0 : 0;
      for (const entry of match.entries) {
        if (entry.outcome === "loss") exitRound.set(entry.participantId, Math.max(exitRound.get(entry.participantId) ?? 0, number));
      }
    }
  }

  const standardComparator = (a: LeagueStandingRecord, b: LeagueStandingRecord) =>
    b.points - a.points || b.opponentWinPercentage - a.opponentWinPercentage ||
    b.wins - a.wins || a.losses - b.losses || a.seed - b.seed;

  let ordered: LeagueStandingRecord[];
  if (format === "ladder") {
    ordered = [...base.values()].sort((a, b) => b.rating - a.rating || b.points - a.points || a.seed - b.seed);
  } else if (format === "points_series" || format === "campaign" || format === "open_play" || format === "free_for_all") {
    ordered = [...base.values()].sort((a, b) => b.points - a.points || b.wins - a.wins || a.seed - b.seed);
  } else if (format === "round_robin" || format === "double_round_robin") {
    const pointGroups = new Map<number, LeagueStandingRecord[]>();
    for (const standing of base.values()) pointGroups.set(standing.points, [...(pointGroups.get(standing.points) ?? []), standing]);
    ordered = [...pointGroups.entries()].sort(([left], [right]) => right - left).flatMap(([, group]) => {
      const ids = new Set(group.map((standing) => standing.participantId));
      const headToHead = new Map(group.map((standing) => [standing.participantId, 0]));
      for (const match of completedHeadToHead(orderedMatches)) {
        if (match.entries.length !== 2 || !match.entries.every((entry) => ids.has(entry.participantId))) continue;
        for (const entry of match.entries) {
          const earned = entry.outcome === "win" ? 3 : entry.outcome === "draw" ? 1 : 0;
          headToHead.set(entry.participantId, (headToHead.get(entry.participantId) ?? 0) + earned);
        }
      }
      return group.sort((a, b) => (headToHead.get(b.participantId) ?? 0) - (headToHead.get(a.participantId) ?? 0) ||
        b.wins - a.wins || b.opponentWinPercentage - a.opponentWinPercentage || a.seed - b.seed);
    });
  } else if (format === "single_elimination" || format === "double_elimination" || format === "swiss_top_cut") {
    const stateOrder: Record<LeagueStandingRecord["status"], number> = { champion: 0, active: 1, eliminated: 2, withdrawn: 3 };
    ordered = [...base.values()].sort((a, b) => stateOrder[a.status] - stateOrder[b.status] ||
      (b.status === "eliminated" ? (exitRound.get(b.participantId) ?? 0) - (exitRound.get(a.participantId) ?? 0) : 0) ||
      (format === "double_elimination" ? a.losses - b.losses : 0) || standardComparator(a, b));
  } else {
    ordered = [...base.values()].sort(standardComparator);
  }

  if (leagueCompleted && ["single_elimination", "double_elimination", "swiss_top_cut"].includes(format)) {
    const terminalRound = [...snapshot.rounds]
      .filter((round) => round.status === "completed" && winnersFromRound(round).length === 1)
      .sort((a, b) => b.number - a.number)[0];
    const championId = terminalRound ? winnersFromRound(terminalRound)[0] : null;
    const champion = championId ? ordered.find((standing) => standing.participantId === championId) : null;
    if (champion) champion.status = "champion";
    ordered.sort((a, b) => (a.status === "champion" ? -1 : b.status === "champion" ? 1 : 0));
  }

  ordered = [...ordered.filter((standing) => standing.status !== "withdrawn"), ...ordered.filter((standing) => standing.status === "withdrawn")];
  ordered.forEach((standing, index) => { standing.rank = index + 1; });
  return ordered;
}

export function swissPairingRound(
  number: number,
  standings: LeagueStandingRecord[],
  matches: LeagueMatchRecord[],
): GeneratedRound {
  const previousPairs = new Set<string>();
  const priorByes = new Map<string, number>();
  for (const match of matches.filter((item) => item.status === "completed")) {
    const ids = match.entries.map((entry) => entry.participantId);
    if (ids.length === 1 && match.entries[0].outcome === "bye") priorByes.set(ids[0], (priorByes.get(ids[0]) ?? 0) + 1);
    if (ids.length === 2) previousPairs.add([...ids].sort().join(":"));
  }

  const pool = standings.filter((standing) => standing.status === "active").map((standing) => standing.participantId);
  const pairings: GeneratedPairing[] = [];
  if (pool.length % 2 !== 0) {
    const minimumByes = Math.min(...pool.map((id) => priorByes.get(id) ?? 0));
    const reverseIndex = [...pool].reverse().findIndex((id) => (priorByes.get(id) ?? 0) === minimumByes);
    const actualIndex = pool.length - 1 - reverseIndex;
    pairings.push({ participantIds: [pool.splice(actualIndex, 1)[0]] });
  }

  const pairingCost = (left: string, right: string) => {
    const leftIndex = standings.findIndex((standing) => standing.participantId === left);
    const rightIndex = standings.findIndex((standing) => standing.participantId === right);
    return (previousPairs.has([left, right].sort().join(":")) ? 100_000 : 0) + Math.abs(leftIndex - rightIndex);
  };
  const greedyPair = (ids: string[]): GeneratedPairing[] => {
    const remaining = [...ids];
    const result: GeneratedPairing[] = [];
    while (remaining.length > 1) {
      const first = remaining.shift()!;
      const candidates = remaining.map((candidate, index) => ({ candidate, index, cost: pairingCost(first, candidate) }))
        .sort((a, b) => a.cost - b.cost || a.index - b.index);
      const opponent = candidates[0];
      result.push({ participantIds: [first, opponent.candidate] });
      remaining.splice(opponent.index, 1);
    }
    return result;
  };
  if (pool.length <= 16) {
    let bestCost = Number.POSITIVE_INFINITY;
    let bestPairings: GeneratedPairing[] | null = null;
    const search = (remaining: string[], cost: number, chosen: GeneratedPairing[]) => {
      if (cost >= bestCost) return;
      if (remaining.length === 0) {
        bestCost = cost;
        bestPairings = chosen;
        return;
      }
      const [first, ...rest] = remaining;
      const candidates = rest.map((candidate, index) => ({ candidate, index, cost: pairingCost(first, candidate) }))
        .sort((a, b) => a.cost - b.cost || a.index - b.index);
      for (const candidate of candidates) {
        const next = [...rest];
        next.splice(candidate.index, 1);
        search(next, cost + candidate.cost, [...chosen, { participantIds: [first, candidate.candidate] }]);
      }
    };
    search(pool, 0, []);
    pairings.push(...(bestPairings ?? greedyPair(pool)));
  } else {
    pairings.push(...greedyPair(pool));
  }
  return { number, stage: "swiss", label: `Swiss round ${number}`, pairings };
}

export function seededEliminationRound(
  number: number,
  participantIds: string[],
  stage: "top_cut" | "upper" | "lower" | "final",
  label: string,
): GeneratedRound {
  const pairings: GeneratedPairing[] = [];
  let bracketSize = 2;
  while (bracketSize < participantIds.length) bracketSize *= 2;
  let seedOrder = [1, 2];
  for (let size = 4; size <= bracketSize; size *= 2) {
    seedOrder = seedOrder.flatMap((seed) => [seed, size + 1 - seed]);
  }
  for (let index = 0; index < seedOrder.length; index += 2) {
    const participants = [seedOrder[index], seedOrder[index + 1]]
      .map((seed) => participantIds[seed - 1])
      .filter((id): id is string => Boolean(id));
    if (participants.length) pairings.push({ participantIds: participants, stage });
  }
  return { number, stage, label, pairings };
}

function completedWinners(matches: LeagueMatchRecord[]): string[] {
  return matches.flatMap((match) => {
    const winner = match.entries.find((entry) => entry.outcome === "win" || entry.outcome === "bye");
    return winner ? [winner.participantId] : [];
  });
}

function completedLosers(matches: LeagueMatchRecord[]): string[] {
  return matches.flatMap((match) => match.entries.filter((entry) => entry.outcome === "loss").map((entry) => entry.participantId));
}

function adjacentPairings(participantIds: string[], stage: "upper" | "lower" | "final"): GeneratedPairing[] {
  const pairings: GeneratedPairing[] = [];
  for (let index = 0; index < participantIds.length; index += 2) {
    pairings.push({ participantIds: participantIds.slice(index, index + 2), stage });
  }
  return pairings;
}

function rematchPairs(matches: LeagueMatchRecord[]): Set<string> {
  return new Set(completedHeadToHead(matches).map((match) => match.entries.map((entry) => entry.participantId).sort().join(":")));
}

function pairLowerSurvivors(
  survivors: string[],
  drops: string[],
  matches: LeagueMatchRecord[],
): GeneratedPairing[] {
  const previous = rematchPairs(matches);
  const left = survivors.length <= drops.length ? survivors : drops;
  const right = survivors.length <= drops.length ? drops : survivors;
  let best: Array<[string, string]> | null = null;
  let bestCost = Number.POSITIVE_INFINITY;

  const search = (index: number, available: string[], selected: Array<[string, string]>, cost: number) => {
    if (cost >= bestCost) return;
    if (index === left.length) { best = selected; bestCost = cost; return; }
    for (let candidateIndex = 0; candidateIndex < available.length; candidateIndex += 1) {
      const candidate = available[candidateIndex];
      const next = [...available]; next.splice(candidateIndex, 1);
      const pairCost = previous.has([left[index], candidate].sort().join(":")) ? 10_000 : candidateIndex;
      search(index + 1, next, [...selected, [left[index], candidate]], cost + pairCost);
    }
  };
  if (left.length <= 8) search(0, right, [], 0);
  const chosen = best ?? left.map((participantId, index) => [participantId, right[index]] as [string, string]);
  const used = new Set(chosen.flat());
  return [
    ...chosen.map(([first, second]) => ({ participantIds: [first, second], stage: "lower" as const })),
    ...[...survivors, ...drops].filter((participantId) => !used.has(participantId))
      .map((participantId) => ({ participantIds: [participantId], stage: "lower" as const })),
  ];
}

/**
 * Advances a standard double-elimination flow in explicit phases:
 * winners + lower consolidation, lower crossover, then the grand final/reset.
 * Keeping the winners and lower groups separate prevents aggregate re-pairing
 * and lets crossover pairing avoid immediate rematches.
 */
export function nextDoubleEliminationRound(
  number: number,
  snapshot: CompetitionSnapshot,
  completedRound: LeagueRoundRecord,
): GeneratedRound | null {
  const upperMatches = completedRound.matches.filter((match) => match.stage === "upper");
  const lowerMatches = completedRound.matches.filter((match) => match.stage === "lower");
  const finalMatches = completedRound.matches.filter((match) => match.stage === "final");

  if (finalMatches.length > 0) {
    const active = calculateStandings("double_elimination", snapshot).filter((standing) => standing.status === "active");
    return active.length === 2
      ? { number, stage: "final", label: "Grand final reset", pairings: [{ participantIds: active.map((standing) => standing.participantId), stage: "final" }] }
      : null;
  }

  if (upperMatches.length > 0 && lowerMatches.length === 0) {
    const upperWinners = completedWinners(upperMatches);
    const openingLosers = completedLosers(upperMatches);
    return {
      number,
      stage: "upper",
      label: "Winners bracket and lower bracket",
      pairings: [...adjacentPairings(upperWinners, "upper"), ...adjacentPairings(openingLosers, "lower")],
    };
  }

  if (upperMatches.length > 0 && lowerMatches.length > 0) {
    const drops = completedLosers(upperMatches);
    const survivors = completedWinners(lowerMatches);
    return {
      number,
      stage: "lower",
      label: "Lower bracket crossover",
      pairings: pairLowerSurvivors(survivors, drops, snapshot.matches),
    };
  }

  if (lowerMatches.length > 0) {
    const lowerWinners = completedWinners(lowerMatches);
    const priorUpperRound = [...snapshot.rounds]
      .filter((round) => round.number < completedRound.number && round.matches.some((match) => match.stage === "upper"))
      .sort((a, b) => b.number - a.number)[0];
    const upperWinners = priorUpperRound
      ? completedWinners(priorUpperRound.matches.filter((match) => match.stage === "upper"))
      : [];
    if (upperWinners.length === 1 && lowerWinners.length === 1) {
      return { number, stage: "final", label: "Grand final", pairings: [{ participantIds: [upperWinners[0], lowerWinners[0]], stage: "final" }] };
    }
    return {
      number,
      stage: "upper",
      label: "Winners bracket and lower bracket",
      pairings: [...adjacentPairings(upperWinners, "upper"), ...adjacentPairings(lowerWinners, "lower")],
    };
  }

  return null;
}

export function winnersFromRound(round: LeagueRoundRecord): string[] {
  return round.matches.flatMap((match) => {
    if (match.status !== "completed") return [];
    const winner = match.entries.find((entry) => entry.outcome === "win" || entry.outcome === "bye");
    return winner ? [winner.participantId] : [];
  });
}

export function hasPlayedMatch(participantId: string, snapshot: CompetitionSnapshot): boolean {
  return completedHeadToHead(snapshot.matches).some((match) => match.entries.some((entry) => entry.participantId === participantId));
}
