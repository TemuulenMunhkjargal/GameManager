import { NextResponse } from "next/server";
import { z } from "zod";
import { container, DEFAULT_ORGANIZATION_ID, resolveActor } from "@/infrastructure/container";

type RouteContext = { params: Promise<{ venueId: string }> };

const schema = z.object({
  name: z.string().min(1),
  capacity: z.coerce.number().int().min(1).nullable().optional(),
});

export async function POST(req: Request, context: RouteContext) {
  const { venueId } = await context.params;
  const actor = await resolveActor(DEFAULT_ORGANIZATION_ID);
  if (!actor) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid room details." }, { status: 400 });

  const result = await container.useCases.createRoom.execute({
    organizationId: DEFAULT_ORGANIZATION_ID,
    actorMembership: actor.membership,
    venueId,
    name: parsed.data.name,
    capacity: parsed.data.capacity ?? null,
  });

  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 403 });
  return NextResponse.json({ room: { id: result.value.id, name: result.value.name } }, { status: 201 });
}
