import { NextResponse } from "next/server";
import { container, DEFAULT_ORGANIZATION_ID, resolveActor } from "@/infrastructure/container";

type RouteContext = {
  params: Promise<{
    membershipId: string;
  }>;
};

export async function POST(_request: Request, context: RouteContext) {
  const { membershipId } = await context.params;

  const actor = await resolveActor(DEFAULT_ORGANIZATION_ID);

  if (!actor) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const result = await container.useCases.reinstateTeammate.execute({
    organizationId: DEFAULT_ORGANIZATION_ID,
    actorMembership: actor.membership,
    membershipId,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 403 });
  }

  return NextResponse.json({ membership: { id: result.value.id, status: result.value.status } });
}
