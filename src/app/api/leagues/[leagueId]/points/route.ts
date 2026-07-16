import { NextResponse } from "next/server";
import { z } from "zod";
import { container, DEFAULT_ORGANIZATION_ID } from "@/infrastructure/container";

const schema = z.object({
  participantId: z.string().min(1),
  points: z.number().int().min(-100).max(100).refine((value) => value !== 0),
  reason: z.string().trim().min(1).max(200),
});

export async function POST(req: Request, { params }: { params: Promise<{ leagueId: string }> }) {
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Choose a player and enter a non-zero whole number from -100 to 100." }, { status: 400 });
  const { leagueId } = await params;
  const result = await container.useCases.awardLeaguePoints.execute({
    organizationId: DEFAULT_ORGANIZATION_ID,
    leagueId,
    participantId: parsed.data.participantId,
    points: parsed.data.points,
    reason: parsed.data.reason,
  });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 403 });

  const [settings, league] = await Promise.all([
    container.settings.get(DEFAULT_ORGANIZATION_ID),
    container.leagues.getDetail(leagueId, DEFAULT_ORGANIZATION_ID),
  ]);
  const participant = league?.participants.find((item) => item.id === parsed.data.participantId);
  if (settings?.discordWebhookUrl && league && participant) {
    const sign = parsed.data.points > 0 ? "+" : "";
    void container.discord.sendLeagueAnnouncement({
      webhookUrl: settings.discordWebhookUrl,
      organizationName: settings.name,
      leagueName: league.name,
      gameSystemLabel: league.gameSystemLabel,
      headline: "League points updated",
      description: `**${participant.memberName}** received ${sign}${parsed.data.points} league points.`,
      fields: [{ name: "Reason", value: parsed.data.reason, inline: false }],
    }).catch((error) => console.error("[league-discord]", error));
  }
  return NextResponse.json({ adjustment: result.value });
}
