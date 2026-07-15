import type { LeagueFormat } from "@/domain/leagues/league";

export type LeagueResultMode = "head_to_head" | "points";

export type LeagueFormatDefinition = {
  value: LeagueFormat;
  label: string;
  summary: string;
  explanation: string;
  bestFor: string;
  resultMode: LeagueResultMode;
};

export const LEAGUE_FORMATS: readonly LeagueFormatDefinition[] = [
  { value: "match_play", label: "Match Play", summary: "Flexible scheduled matchups", explanation: "Schedule head-to-head games in any order. Wins, losses, draws, and points build the standings throughout the season.", bestFor: "Weekly TCG, board-game, and video-game leagues", resultMode: "head_to_head" },
  { value: "round_robin", label: "Round Robin", summary: "Everyone plays everyone once", explanation: "Every participant meets every other participant once, producing a complete and easy-to-understand table.", bestFor: "Small groups where everyone should meet", resultMode: "head_to_head" },
  { value: "double_round_robin", label: "Double Round Robin", summary: "Everyone plays everyone twice", explanation: "Each pairing is played twice, reducing the effect of a single upset and supporting rematches or home-and-away rounds.", bestFor: "Small, longer-running competitive seasons", resultMode: "head_to_head" },
  { value: "swiss", label: "Swiss", summary: "Players face others on similar records", explanation: "Players continue through a set number of rounds without elimination. Later rounds pair participants with similar results.", bestFor: "TCGs and larger events with limited rounds", resultMode: "head_to_head" },
  { value: "swiss_top_cut", label: "Swiss + Top Cut", summary: "Swiss rounds followed by playoffs", explanation: "Swiss standings seed the highest-ranked players into a final single-elimination playoff, often a Top 4 or Top 8.", bestFor: "Competitive TCG and tabletop championships", resultMode: "head_to_head" },
  { value: "single_elimination", label: "Single Elimination", summary: "One loss removes a player", explanation: "A knockout bracket advances winners until one champion remains. It is fast, decisive, and unforgiving.", bestFor: "Playoffs and one-session competitions", resultMode: "head_to_head" },
  { value: "double_elimination", label: "Double Elimination", summary: "Two losses remove a player", explanation: "Players move between winners and losers brackets and are eliminated after their second loss.", bestFor: "Fighting games and events that allow a recovery run", resultMode: "head_to_head" },
  { value: "ladder", label: "Ladder / Challenge", summary: "Players challenge for rank", explanation: "An ongoing ranking where players arrange challenges and climb by defeating players near or above them.", bestFor: "Flexible drop-in communities and long seasons", resultMode: "head_to_head" },
  { value: "free_for_all", label: "Free-for-All / Pods", summary: "Three or more players share each game", explanation: "Record placement or performance as league points for multiplayer tables and rotating pods rather than forcing a 1v1 result.", bestFor: "Commander, multiplayer board games, and battle royales", resultMode: "points" },
  { value: "points_series", label: "Cumulative Points Series", summary: "Placements and objectives award points", explanation: "Add points from each session, race, scenario, or objective. The participant with the highest total leads the series.", bestFor: "Miniatures, racing, esports, and varied game nights", resultMode: "points" },
  { value: "campaign", label: "Campaign / Narrative", summary: "Track progression across scenarios", explanation: "Award points for scenario results, objectives, milestones, or narrative achievements across a connected campaign.", bestFor: "War games, RPG-adjacent play, and legacy games", resultMode: "points" },
  { value: "open_play", label: "Open Play", summary: "Casual participation without pairings", explanation: "Use simple participation points for an informal season where attendance and completed games matter more than a bracket.", bestFor: "Learn-to-play nights and casual communities", resultMode: "points" },
] as const;

export const LEAGUE_FORMAT_VALUES = LEAGUE_FORMATS.map((format) => format.value) as [LeagueFormat, ...LeagueFormat[]];

export function getLeagueFormat(value: LeagueFormat): LeagueFormatDefinition {
  return LEAGUE_FORMATS.find((format) => format.value === value) ?? LEAGUE_FORMATS[0];
}
