import { NextResponse } from "next/server";
import { z } from "zod";
import { container, DEFAULT_ORGANIZATION_ID } from "@/infrastructure/container";

type RouteContext = {
  params: Promise<{
    eventId: string;
  }>;
};

const updateEventSchema = z.object({
  title: z.string().min(1),
  description: z.string().default(""),
  gameSystem: z.string().min(1),
  gameSystemId: z.string().nullable().default(null),
  startsAt: z.string().min(1),
  endsAt: z.string().min(1),
  capacity: z.coerce.number().int().min(1).max(999),
  entryFeeInCents: z.coerce.number().int().min(0).max(100000),
  waitlistEnabled: z.boolean(),
});

export async function GET(_request: Request, context: RouteContext) {
  const { eventId } = await context.params;
  const event = await container.events.getDetail(eventId, DEFAULT_ORGANIZATION_ID);

  if (!event) {
    return NextResponse.json({ error: "Event not found." }, { status: 404 });
  }

  const registrations = await container.registrations.listForEvent(eventId);

  return NextResponse.json({ event, registrations });
}

export async function PUT(request: Request, context: RouteContext) {
  const { eventId } = await context.params;

  const body = await request.json();
  const parsed = updateEventSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid event details.", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const result = await container.useCases.updateEvent.execute({
    organizationId: DEFAULT_ORGANIZATION_ID,
    eventId,
    title: parsed.data.title,
    description: parsed.data.description,
    gameSystemLabel: parsed.data.gameSystem,
    gameSystemId: parsed.data.gameSystemId,
    startsAt: new Date(parsed.data.startsAt),
    endsAt: new Date(parsed.data.endsAt),
    capacity: parsed.data.capacity,
    entryFeeInCents: parsed.data.entryFeeInCents,
    waitlistEnabled: parsed.data.waitlistEnabled,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  const event = await container.events.getDetail(result.value.id, DEFAULT_ORGANIZATION_ID);

  return NextResponse.json({ event });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { eventId } = await context.params;
  const result = await container.useCases.archiveEvent.execute({
    organizationId: DEFAULT_ORGANIZATION_ID,
    eventId,
  });

  if (!result.ok) {
    const status = result.error === "Event not found." ? 404 : result.error === "Event is already archived." ? 409 : 400;
    return NextResponse.json({ error: result.error }, { status });
  }

  return NextResponse.json({ ok: true, archived: true });
}

