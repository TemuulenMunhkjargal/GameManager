import { NextResponse } from "next/server";
import { z } from "zod";
import { APP_BASE_URL, container, DEFAULT_ORGANIZATION_ID, resolveActor } from "@/infrastructure/container";

const createEventSchema = z.object({
  title: z.string().min(1),
  description: z.string().default(""),
  gameSystem: z.string().min(1),
  venueId: z.string().optional().nullable(),
  venueName: z.string().min(1),
  roomId: z.string().optional().nullable(),
  roomName: z.string().optional().nullable(),
  startsAt: z.string().min(1),
  endsAt: z.string().min(1),
  capacity: z.coerce.number().int().min(1).max(999),
  entryFeeInCents: z.coerce.number().int().min(0).max(100000),
  waitlistEnabled: z.boolean(),
  publishImmediately: z.boolean().default(true),
});

export async function GET() {
  const events = await container.events.listForOrganization(DEFAULT_ORGANIZATION_ID);
  return NextResponse.json({ events });
}

export async function POST(request: Request) {
  const actor = await resolveActor(DEFAULT_ORGANIZATION_ID);

  if (!actor) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const body = await request.json();
  const parsed = createEventSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid event details.", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const result = await container.useCases.createEvent.execute({
    organizationId: DEFAULT_ORGANIZATION_ID,
    actorMembership: actor.membership,
    title: parsed.data.title,
    description: parsed.data.description,
    gameSystemLabel: parsed.data.gameSystem,
    venueId: parsed.data.venueId ?? null,
    venueName: parsed.data.venueName,
    roomId: parsed.data.roomId ?? null,
    roomName: parsed.data.roomName ?? null,
    startsAt: new Date(parsed.data.startsAt),
    endsAt: new Date(parsed.data.endsAt),
    capacity: parsed.data.capacity,
    entryFeeInCents: parsed.data.entryFeeInCents,
    waitlistEnabled: parsed.data.waitlistEnabled,
    publishImmediately: parsed.data.publishImmediately,
    appBaseUrl: APP_BASE_URL,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 403 });
  }

  const event = await container.events.getDetail(result.value.id, DEFAULT_ORGANIZATION_ID);

  return NextResponse.json({ event }, { status: 201 });
}
