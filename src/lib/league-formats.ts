import type { LeagueFormat } from "@/domain/leagues/league";

export type LeagueResultMode = "head_to_head" | "points";
export type LeaguePairingMode = "manual" | "round_robin" | "swiss" | "elimination" | "ladder" | "pod" | "points";

export type LeagueFormatDefinition = {
  value: LeagueFormat;
  label: string;
  summary: string;
  explanation: string;
  bestFor: string;
  resultMode: LeagueResultMode;
  pairingMode: LeaguePairingMode;
  minimumParticipants: number;
  allowsLateEnrollment: boolean;
};

export const LEAGUE_FORMATS: readonly LeagueFormatDefinition[] = [
  { value: "match_play", label: "Match Play", summary: "Flexible scheduled matchups", explanation: "Schedule head-to-head games in any order. Wins, losses, draws, and points build the standings throughout the season.", bestFor: "Weekly TCG, board-game, and video-game leagues", resultMode: "head_to_head", pairingMode: "manual", minimumParticipants: 2, allowsLateEnrollment: true },
  { value: "round_robin", label: "Round Robin", summary: "Everyone plays everyone once", explanation: "Every participant meets every other participant once, producing a complete and easy-to-understand table.", bestFor: "Small groups where everyone should meet", resultMode: "head_to_head", pairingMode: "round_robin", minimumParticipants: 2, allowsLateEnrollment: false },
  { value: "double_round_robin", label: "Double Round Robin", summary: "Everyone plays everyone twice", explanation: "Each pairing is played twice, reducing the effect of a single upset and supporting rematches or home-and-away rounds.", bestFor: "Small, longer-running competitive seasons", resultMode: "head_to_head", pairingMode: "round_robin", minimumParticipants: 2, allowsLateEnrollment: false },
  { value: "swiss", label: "Swiss", summary: "Players face others on similar records", explanation: "Players continue through a set number of rounds without elimination. Later rounds pair participants with similar results and avoid rematches whenever possible.", bestFor: "TCGs and larger events with limited rounds", resultMode: "head_to_head", pairingMode: "swiss", minimumParticipants: 4, allowsLateEnrollment: false },
  { value: "swiss_top_cut", label: "Swiss + Top Cut", summary: "Swiss rounds followed by playoffs", explanation: "Swiss standings seed the highest-ranked players into a single-elimination Top Cut. Pairings, byes, seeding, and playoff advancement are managed automatically.", bestFor: "Competitive TCG and tabletop championships", resultMode: "head_to_head", pairingMode: "swiss", minimumParticipants: 4, allowsLateEnrollment: false },
  { value: "single_elimination", label: "Single Elimination", summary: "One loss removes a player", explanation: "A seeded knockout bracket advances winners until one champion remains. Byes are assigned automatically when the field is not a power of two.", bestFor: "Playoffs and one-session competitions", resultMode: "head_to_head", pairingMode: "elimination", minimumParticipants: 2, allowsLateEnrollment: false },
  { value: "double_elimination", label: "Double Elimination", summary: "Two losses remove a player", explanation: "Undefeated and one-loss brackets advance separately. A player is eliminated only after a second loss, including a reset final when required.", bestFor: "Fighting games and events that allow a recovery run", resultMode: "head_to_head", pairingMode: "elimination", minimumParticipants: 3, allowsLateEnrollment: false },
  { value: "ladder", label: "Ladder / Challenge", summary: "Players challenge for rank", explanation: "An ongoing Elo-rated ranking where players arrange challenges and climb by defeating opponents. New players can join while it is active.", bestFor: "Flexible drop-in communities and long seasons", resultMode: "head_to_head", pairingMode: "ladder", minimumParticipants: 2, allowsLateEnrollment: true },
  { value: "free_for_all", label: "Free-for-All / Pods", summary: "Three or more players share each game", explanation: "Record complete pods of at least three players. First place counts as a pod win, every other placement counts as a loss, and the points you enter determine the ranking.", bestFor: "Commander, multiplayer board games, and battle royales", resultMode: "points", pairingMode: "pod", minimumParticipants: 3, allowsLateEnrollment: true },
  { value: "points_series", label: "Cumulative Points Series", summary: "Placements and objectives award points", explanation: "Add auditable point adjustments from each session, race, scenario, or objective. Corrections can be removed without rewriting history.", bestFor: "Miniatures, racing, esports, and varied game nights", resultMode: "points", pairingMode: "points", minimumParticipants: 1, allowsLateEnrollment: true },
  { value: "campaign", label: "Campaign / Narrative", summary: "Track progression across scenarios", explanation: "Award auditable points for scenario results, objectives, milestones, or narrative achievements across a connected campaign.", bestFor: "War games, RPG-adjacent play, and legacy games", resultMode: "points", pairingMode: "points", minimumParticipants: 1, allowsLateEnrollment: true },
  { value: "open_play", label: "Open Play", summary: "Casual participation without pairings", explanation: "Record auditable attendance and participation points for an informal season without forced rounds or brackets.", bestFor: "Learn-to-play nights and casual communities", resultMode: "points", pairingMode: "points", minimumParticipants: 1, allowsLateEnrollment: true },
] as const;

export const LEAGUE_FORMAT_VALUES = LEAGUE_FORMATS.map((format) => format.value) as [LeagueFormat, ...LeagueFormat[]];

export function getLeagueFormat(value: LeagueFormat): LeagueFormatDefinition {
  return LEAGUE_FORMATS.find((format) => format.value === value) ?? LEAGUE_FORMATS[0];
}
