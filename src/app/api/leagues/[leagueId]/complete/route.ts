import { NextResponse } from "next/server";
import { container, DEFAULT_ORGANIZATION_ID, resolveActor } from "@/infrastructure/container";

export async function POST(_request: Request, { params }: { params: Promise<{ leagueId: string }> }) {
  const actor = await resolveActor(DEFAULT_ORGANIZATION_ID);
  if (!actor) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const leagueId = (await params).leagueId;
  const result = await container.useCases.completeLeague.execute({ organizationId: DEFAULT_ORGANIZATION_ID, actorMembership: actor.membership, leagueId });
  if (result.ok) {
    const [league, settings] = await Promise.all([container.leagues.getDetail(leagueId, DEFAULT_ORGANIZATION_ID), container.settings.get(DEFAULT_ORGANIZATION_ID)]);
    if (league && settings?.discordWebhookUrl) {
      const winner = league.standings[0];
      void container.discord.sendLeagueAnnouncement({ webhookUrl: settings.discordWebhookUrl, organizationName: settings.name, leagueName: league.name, gameSystemLabel: league.gameSystemLabel, headline: winner ? `${winner.memberName} wins ${league.name}` : `${league.name} completed`, description: winner ? `Congratulations to **${winner.memberName}**, finishing with ${winner.points} points.` : "The league has concluded.", fields: [{ name: "Participants", value: String(league.participantCount), inline: true }] }).catch((error) => console.error("[league-discord]", error));
    }
  }
  return result.ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: result.error }, { status: 400 });
}
