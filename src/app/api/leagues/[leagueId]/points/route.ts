import { NextResponse } from "next/server";
import { z } from "zod";
import { container, DEFAULT_ORGANIZATION_ID, resolveActor } from "@/infrastructure/container";

const schema = z.object({
  memberProfileId: z.string().min(1),
  points: z.number().int().min(-100).max(100).refine((value) => value !== 0),
});

export async function POST(req: Request, { params }: { params: Promise<{ leagueId: string }> }) {
  const actor = await resolveActor(DEFAULT_ORGANIZATION_ID);
  if (!actor) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Choose a player and enter a non-zero whole number from -100 to 100." }, { status: 400 });
  const { leagueId } = await params;
  const result = await container.useCases.awardLeaguePoints.execute({
    organizationId: DEFAULT_ORGANIZATION_ID,
    actorMembership: actor.membership,
    leagueId,
    memberProfileId: parsed.data.memberProfileId,
    points: parsed.data.points,
  });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 403 });

  const [settings, league, member] = await Promise.all([
    container.settings.get(DEFAULT_ORGANIZATION_ID),
    container.leagues.getDetail(leagueId, DEFAULT_ORGANIZATION_ID),
    container.members.findById(parsed.data.memberProfileId),
  ]);
  if (settings?.discordWebhookUrl && league && member) {
    const sign = parsed.data.points > 0 ? "+" : "";
    void container.discord.sendLeagueAnnouncement({
      webhookUrl: settings.discordWebhookUrl,
      organizationName: settings.name,
      leagueName: league.name,
      gameSystemLabel: league.gameSystemLabel,
      headline: "League points updated",
      description: `**${member.displayName}** received ${sign}${parsed.data.points} league points.`,
      fields: [{ name: "New total", value: String(result.value.points), inline: true }],
    }).catch((error) => console.error("[league-discord]", error));
  }
  return NextResponse.json({ standing: { id: result.value.id, points: result.value.points } });
}
