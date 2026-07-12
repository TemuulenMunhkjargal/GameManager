import { NextResponse } from "next/server";
import { container, DEFAULT_ORGANIZATION_ID, resolveActor } from "@/infrastructure/container";

type RouteContext = { params: Promise<{ venueId: string }> };

export async function POST(_req: Request, context: RouteContext) {
  const { venueId } = await context.params;
  const actor = await resolveActor(DEFAULT_ORGANIZATION_ID);
  if (!actor) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const result = await container.useCases.restoreVenue.execute({
    organizationId: DEFAULT_ORGANIZATION_ID,
    actorMembership: actor.membership,
    venueId,
  });

  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 403 });
  return NextResponse.json({ venue: { id: result.value.id, status: result.value.status } });
}
