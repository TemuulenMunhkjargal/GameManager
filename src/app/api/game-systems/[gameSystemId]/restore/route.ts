import { NextResponse } from "next/server";
import { container, DEFAULT_ORGANIZATION_ID, resolveActor } from "@/infrastructure/container";

type RouteContext = { params: Promise<{ gameSystemId: string }> };

export async function POST(_req: Request, context: RouteContext) {
  const { gameSystemId } = await context.params;
  const actor = await resolveActor(DEFAULT_ORGANIZATION_ID);
  if (!actor) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const result = await container.useCases.restoreGameSystem.execute({
    organizationId: DEFAULT_ORGANIZATION_ID,
    actorMembership: actor.membership,
    gameSystemId,
  });

  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 403 });
  return NextResponse.json({ gameSystem: { id: result.value.id, status: result.value.status } });
}
