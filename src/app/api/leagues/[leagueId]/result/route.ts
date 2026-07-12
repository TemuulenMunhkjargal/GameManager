import { NextResponse } from "next/server";
import { z } from "zod";
import { container, DEFAULT_ORGANIZATION_ID, resolveActor } from "@/infrastructure/container";

type RouteContext = { params: Promise<{ leagueId: string }> };

const schema = z.object({
  memberProfileId: z.string().min(1),
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
    result: parsed.data.result,
  });

  if (!standing.ok) return NextResponse.json({ error: standing.error }, { status: 403 });
  return NextResponse.json({ standing: { id: standing.value.id, points: standing.value.points } });
}
