import { NextResponse } from "next/server";
import { z } from "zod";
import { container, DEFAULT_ORGANIZATION_ID, resolveActor } from "@/infrastructure/container";

const schema = z.object({
  name: z.string().min(1),
  address: z.string().nullable().optional(),
});

export async function GET(request: Request) {
  const includeArchived = new URL(request.url).searchParams.get("includeArchived") === "true";
  const venues = await container.venues.listForOrganization(DEFAULT_ORGANIZATION_ID, { includeArchived });
  return NextResponse.json({ venues });
}

export async function POST(req: Request) {
  const actor = await resolveActor(DEFAULT_ORGANIZATION_ID);
  if (!actor) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid venue details." }, { status: 400 });

  const result = await container.useCases.createVenue.execute({
    organizationId: DEFAULT_ORGANIZATION_ID,
    actorMembership: actor.membership,
    name: parsed.data.name,
    address: parsed.data.address ?? null,
  });

  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 403 });
  return NextResponse.json({ venue: { id: result.value.id, name: result.value.name } }, { status: 201 });
}
