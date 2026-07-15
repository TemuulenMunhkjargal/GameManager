import { NextResponse } from "next/server";
import { z } from "zod";
import { container, DEFAULT_ORGANIZATION_ID, resolveActor } from "@/infrastructure/container";
import { getLeagueFormat, LEAGUE_FORMAT_VALUES } from "@/lib/league-formats";

const schema = z.object({
  name: z.string().min(1),
  gameSystemLabel: z.string().default("Other"),
  format: z.enum(LEAGUE_FORMAT_VALUES).default("match_play"),
  description: z.string().default(""),
  startsAt: z.string().nullable().optional(),
  endsAt: z.string().nullable().optional(),
});

export async function GET() {
  const leagues = await container.leagues.listForOrganization(DEFAULT_ORGANIZATION_ID);
  return NextResponse.json({ leagues });
}

export async function POST(req: Request) {
  const actor = await resolveActor(DEFAULT_ORGANIZATION_ID);
  if (!actor) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid league details." }, { status: 400 });

  const result = await container.useCases.createLeague.execute({
    organizationId: DEFAULT_ORGANIZATION_ID,
    actorMembership: actor.membership,
    name: parsed.data.name,
    gameSystemLabel: parsed.data.gameSystemLabel,
    format: parsed.data.format,
    description: parsed.data.description,
    startsAt: parsed.data.startsAt ? new Date(parsed.data.startsAt) : null,
    endsAt: parsed.data.endsAt ? new Date(parsed.data.endsAt) : null,
  });

  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 403 });
  const settings = await container.settings.get(DEFAULT_ORGANIZATION_ID);
  if (settings?.discordWebhookUrl) {
    const format = getLeagueFormat(result.value.format);
    const fields = [{ name: "Format", value: `${format.label} — ${format.summary}`, inline: false }];
    if (result.value.startsAt) fields.push({ name: "Starts", value: result.value.startsAt.toLocaleDateString(), inline: true });
    void container.discord.sendLeagueAnnouncement({ webhookUrl: settings.discordWebhookUrl, organizationName: settings.name, leagueName: result.value.name, gameSystemLabel: result.value.gameSystemLabel, headline: "New league created", description: result.value.description || "A new league is ready for players.", fields }).catch((error) => console.error("[league-discord]", error));
  }
  return NextResponse.json({ league: { id: result.value.id, name: result.value.name } }, { status: 201 });
}
