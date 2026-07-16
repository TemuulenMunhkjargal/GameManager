import type { League } from "../../domain/leagues/league";
import type { OrganizationId } from "../../domain/organizations/organization";
import { getLeagueFormat } from "../../lib/league-formats";
import type { LeagueQueries } from "../leagues/ports";
import type { OrganizationSettingsQueries } from "../organizations/ports";
import type { DiscordGateway } from "../shared/discord-gateway";

type Dependencies = {
  leagues: LeagueQueries;
  settings: OrganizationSettingsQueries;
  discord: DiscordGateway;
};

async function safelyAnnounce(label: string, send: () => Promise<void>): Promise<void> {
  try {
    await send();
  } catch (error) {
    console.error(`[league-discord:${label}]`, error);
  }
}

export async function announceLeagueCreated(
  dependencies: Dependencies,
  organizationId: OrganizationId,
  league: League,
): Promise<void> {
  await safelyAnnounce("created", async () => {
    const settings = await dependencies.settings.get(organizationId);
    if (!settings?.discordWebhookUrl) return;
    const format = getLeagueFormat(league.format);
    const fields = [{ name: "Format", value: `${format.label} — ${format.summary}`, inline: false }];
    if (league.startsAt) {
      fields.push({
        name: "Starts",
        value: league.startsAt.toLocaleDateString("en-US", { timeZone: settings.timezone }),
        inline: true,
      });
    }
    await dependencies.discord.sendLeagueAnnouncement({
      webhookUrl: settings.discordWebhookUrl,
      organizationName: settings.name,
      leagueName: league.name,
      gameSystemLabel: league.gameSystemLabel,
      headline: "New league created",
      description: league.description || "A new league is ready for players.",
      fields,
    });
  });
}

export async function announceLeagueParticipant(
  dependencies: Dependencies,
  organizationId: OrganizationId,
  leagueId: string,
  participantId: string,
): Promise<void> {
  await safelyAnnounce("participant", async () => {
    const [league, settings] = await Promise.all([
      dependencies.leagues.getDetail(leagueId, organizationId),
      dependencies.settings.get(organizationId),
    ]);
    if (!league || !settings?.discordWebhookUrl) return;
    const participant = league.participants.find((item) => item.id === participantId);
    if (!participant) return;
    await dependencies.discord.sendLeagueAnnouncement({
      webhookUrl: settings.discordWebhookUrl,
      organizationName: settings.name,
      leagueName: league.name,
      gameSystemLabel: league.gameSystemLabel,
      headline: `${participant.memberName} joined ${league.name}`,
      description: `**${participant.memberName}** is now registered for the league.`,
      fields: [{ name: "Participants", value: String(league.participantCount), inline: true }],
    });
  });
}

export async function announceLeagueCompleted(
  dependencies: Dependencies,
  organizationId: OrganizationId,
  leagueId: string,
): Promise<void> {
  await safelyAnnounce("completed", async () => {
    const [league, settings] = await Promise.all([
      dependencies.leagues.getDetail(leagueId, organizationId),
      dependencies.settings.get(organizationId),
    ]);
    if (!league || !settings?.discordWebhookUrl) return;
    const winner = league.championParticipantId
      ? league.standings.find((standing) => standing.participantId === league.championParticipantId)
      : null;
    await dependencies.discord.sendLeagueAnnouncement({
      webhookUrl: settings.discordWebhookUrl,
      organizationName: settings.name,
      leagueName: league.name,
      gameSystemLabel: league.gameSystemLabel,
      headline: winner ? `${winner.memberName} wins ${league.name}` : `${league.name} completed`,
      description: winner
        ? `Congratulations to **${winner.memberName}**, finishing with ${winner.points} points.`
        : "The league has concluded.",
      fields: [{ name: "Participants", value: String(league.participantCount), inline: true }],
    });
  });
}
