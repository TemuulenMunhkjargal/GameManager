import { describe, expect, it, vi } from "vitest";
import {
  announceLeagueCompleted,
  announceLeagueCreated,
  announceLeagueParticipant,
} from "@/application/communications/league-announcements";
import type { DiscordGateway } from "@/application/shared/discord-gateway";
import type { LeagueSummaryDTO } from "@/application/leagues/ports";
import { League } from "@/domain/leagues/league";

function detail(): LeagueSummaryDTO {
  const enrolledAt = new Date("2030-01-01T00:00:00Z");
  return {
    id: "league_1",
    name: "Summer League",
    gameSystemLabel: "Magic: The Gathering",
    description: "",
    format: "single_elimination",
    status: "completed",
    startsAt: null,
    endsAt: null,
    configuredRounds: 0,
    topCutSize: 4,
    participantCount: 2,
    participants: [
      { id: "points_leader", leagueId: "league_1", memberProfileId: "member_1", memberName: "Alex", seed: 1, status: "active", enrolledAt, canRemove: false },
      { id: "bracket_winner", leagueId: "league_1", memberProfileId: "member_2", memberName: "Blair", seed: 2, status: "active", enrolledAt, canRemove: false },
    ],
    standings: [
      { participantId: "points_leader", memberProfileId: "member_1", memberName: "Alex", rank: 1, seed: 1, status: "active", played: 3, wins: 2, losses: 1, draws: 0, byes: 0, points: 6, opponentWinPercentage: 0.6, rating: 6.6 },
      { participantId: "bracket_winner", memberProfileId: "member_2", memberName: "Blair", rank: 2, seed: 2, status: "champion", played: 3, wins: 2, losses: 1, draws: 0, byes: 0, points: 5, opponentWinPercentage: 0.5, rating: 5.5 },
    ],
    rounds: [],
    ungroupedMatches: [],
    adjustments: [],
    unresolvedMatchCount: 0,
    phase: "Complete",
    championParticipantId: "bracket_winner",
  };
}

function dependencies(sendLeagueAnnouncement = vi.fn(async () => undefined)) {
  const league = detail();
  const discord: DiscordGateway = {
    sendEventAnnouncement: vi.fn(async () => undefined),
    sendLeagueAnnouncement,
  };
  return {
    league,
    discord,
    value: {
      leagues: {
        listForOrganization: vi.fn(async () => [league]),
        getDetail: vi.fn(async () => league),
      },
      settings: {
        get: vi.fn(async () => ({
          id: "org_1",
          name: "Friday Games",
          timezone: "America/Chicago",
          contactEmail: "",
          waitlistsEnabledByDefault: true,
          discordWebhookUrl: "https://discord.com/api/webhooks/1/token",
        })),
      },
      discord,
    },
  };
}

describe("league Discord announcements", () => {
  it("announces new leagues with their configured format", async () => {
    const { value, discord } = dependencies();
    const league = new League("league_1", "org_1", null, "Chess", "City Ladder", "", "ladder", "draft", null, null);

    await announceLeagueCreated(value, "org_1", league);

    expect(discord.sendLeagueAnnouncement).toHaveBeenCalledWith(expect.objectContaining({
      headline: "New league created",
      leagueName: "City Ladder",
      fields: expect.arrayContaining([expect.objectContaining({ name: "Format", value: expect.stringContaining("Ladder") })]),
    }));
  });

  it("announces the participant that was enrolled", async () => {
    const { value, discord } = dependencies();

    await announceLeagueParticipant(value, "org_1", "league_1", "bracket_winner");

    expect(discord.sendLeagueAnnouncement).toHaveBeenCalledWith(expect.objectContaining({
      headline: "Blair joined Summer League",
      description: expect.stringContaining("Blair"),
    }));
  });

  it("uses the bracket champion instead of the first aggregate standing", async () => {
    const { value, discord } = dependencies();

    await announceLeagueCompleted(value, "org_1", "league_1");

    expect(discord.sendLeagueAnnouncement).toHaveBeenCalledWith(expect.objectContaining({
      headline: "Blair wins Summer League",
      description: expect.stringContaining("Blair"),
    }));
  });

  it("never rejects a completed mutation when Discord is unavailable", async () => {
    const send = vi.fn(async () => { throw new Error("Discord is offline"); });
    const { value } = dependencies(send);
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);

    await expect(announceLeagueCompleted(value, "org_1", "league_1")).resolves.toBeUndefined();

    expect(consoleError).toHaveBeenCalledWith("[league-discord:completed]", expect.any(Error));
    consoleError.mockRestore();
  });
});
