import { NextResponse } from "next/server";
import { z } from "zod";
import { container, DEFAULT_ORGANIZATION_ID, resolveActor } from "@/infrastructure/container";

type RouteContext = { params: Promise<{ leagueId: string }> };

const schema = z.object({
  memberProfileId: z.string().min(1),
  opponentProfileId: z.string().min(1),
  result: z.enum(["win", "loss", "draw"]),
});

export async function POST(req: Request, context: RouteContext) {
  const { leagueId } = await context.params;
  const actor = await resolveActor(DEFAULT_ORGANIZATION_ID);
  if (!actor) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid result." }, { status: 400 });

  const standing = await container.useCases.recordLeagueResult.execute({
    organizationId: DEFAULT_ORGANIZATION_ID,
    actorMembership: actor.membership,
    leagueId,
    memberProfileId: parsed.data.memberProfileId,
    opponentProfileId: parsed.data.opponentProfileId,
    result: parsed.data.result,
  });

  if (!standing.ok) return NextResponse.json({ error: standing.error }, { status: 403 });
  const [league, member, opponent, settings] = await Promise.all([container.leagues.getDetail(leagueId, DEFAULT_ORGANIZATION_ID), container.members.findById(parsed.data.memberProfileId), container.members.findById(parsed.data.opponentProfileId), container.settings.get(DEFAULT_ORGANIZATION_ID)]);
  if (league && member && opponent && settings?.discordWebhookUrl) {
    const outcome = parsed.data.result === "draw" ? `${member.displayName} and ${opponent.displayName} recorded a draw.` : `${parsed.data.result === "win" ? member.displayName : opponent.displayName} won against ${parsed.data.result === "win" ? opponent.displayName : member.displayName}.`;
    void container.discord.sendLeagueAnnouncement({ webhookUrl: settings.discordWebhookUrl, organizationName: settings.name, leagueName: league.name, gameSystemLabel: league.gameSystemLabel, headline: "League result recorded", description: outcome, fields: [{ name: "Participants", value: `${member.displayName} vs. ${opponent.displayName}` }] }).catch((error) => console.error("[league-discord]", error));
  }
  return NextResponse.json({ standing: { id: standing.value.id, points: standing.value.points } });
}
