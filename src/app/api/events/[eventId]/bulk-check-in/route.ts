import { NextResponse } from "next/server";
import { z } from "zod";
import { container, DEFAULT_ORGANIZATION_ID, resolveActor } from "@/infrastructure/container";

type RouteContext = { params: Promise<{ eventId: string }> };

const schema = z.object({
  registrationIds: z.array(z.string().min(1)).min(1, "Select at least one registration."),
});

export async function POST(request: Request, context: RouteContext) {
  const { eventId } = await context.params;

  const actor = await resolveActor(DEFAULT_ORGANIZATION_ID);

  if (!actor) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const body = await request.json();
  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const result = await container.useCases.bulkCheckIn.execute({
    actorMembership: actor.membership,
    eventId,
    registrationIds: parsed.data.registrationIds,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 403 });
  }

  return NextResponse.json(result.value);
}
