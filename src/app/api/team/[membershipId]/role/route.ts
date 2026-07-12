import { NextResponse } from "next/server";
import { z } from "zod";
import { container, DEFAULT_ORGANIZATION_ID, resolveActor } from "@/infrastructure/container";

type RouteContext = {
  params: Promise<{
    membershipId: string;
  }>;
};

const updateRoleSchema = z.object({
  role: z.enum(["owner", "admin", "event_manager", "staff", "viewer"]),
});

export async function POST(request: Request, context: RouteContext) {
  const { membershipId } = await context.params;

  const actor = await resolveActor(DEFAULT_ORGANIZATION_ID);

  if (!actor) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const body = await request.json();
  const parsed = updateRoleSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid role." }, { status: 400 });
  }

  const result = await container.useCases.updateTeammateRole.execute({
    organizationId: DEFAULT_ORGANIZATION_ID,
    actorMembership: actor.membership,
    membershipId,
    newRole: parsed.data.role,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 403 });
  }

  return NextResponse.json({ membership: { id: result.value.id, role: result.value.role } });
}
