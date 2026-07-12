import { NextResponse } from "next/server";
import { z } from "zod";
import { container, DEFAULT_ORGANIZATION_ID, resolveActor } from "@/infrastructure/container";

const schema = z.object({
  name: z.string().min(1),
  gameSystemLabel: z.string().default("Other"),
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
    description: parsed.data.description,
    startsAt: parsed.data.startsAt ? new Date(parsed.data.startsAt) : null,
    endsAt: parsed.data.endsAt ? new Date(parsed.data.endsAt) : null,
  });

  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 403 });
  return NextResponse.json({ league: { id: result.value.id, name: result.value.name } }, { status: 201 });
}
