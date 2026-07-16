import { NextResponse } from "next/server";
import { z } from "zod";
import { announceLeagueCreated } from "@/application/communications/league-announcements";
import { container, DEFAULT_ORGANIZATION_ID } from "@/infrastructure/container";
import { LEAGUE_FORMAT_VALUES } from "@/lib/league-formats";

const schema = z.object({
  name: z.string().min(1),
  gameSystemLabel: z.string().default("Other"),
  format: z.enum(LEAGUE_FORMAT_VALUES).default("match_play"),
  description: z.string().default(""),
  startsAt: z.string().nullable().optional(),
  endsAt: z.string().nullable().optional(),
  configuredRounds: z.number().int().min(0).max(20).default(0),
  topCutSize: z.union([z.literal(2), z.literal(4), z.literal(8), z.literal(16)]).default(4),
});

export async function GET() {
  const leagues = await container.leagues.listForOrganization(DEFAULT_ORGANIZATION_ID);
  return NextResponse.json({ leagues });
}

export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid league details." }, { status: 400 });

  const result = await container.useCases.createLeague.execute({
    organizationId: DEFAULT_ORGANIZATION_ID,
    name: parsed.data.name,
    gameSystemLabel: parsed.data.gameSystemLabel,
    format: parsed.data.format,
    description: parsed.data.description,
    startsAt: parsed.data.startsAt ? new Date(parsed.data.startsAt) : null,
    endsAt: parsed.data.endsAt ? new Date(parsed.data.endsAt) : null,
    configuredRounds: parsed.data.configuredRounds,
    topCutSize: parsed.data.topCutSize,
  });

  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 403 });
  void announceLeagueCreated(container, DEFAULT_ORGANIZATION_ID, result.value);
  return NextResponse.json({ league: { id: result.value.id, name: result.value.name } }, { status: 201 });
}
