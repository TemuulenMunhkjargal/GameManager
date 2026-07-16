import { NextResponse } from "next/server";
import { z } from "zod";
import { container, DEFAULT_ORGANIZATION_ID } from "@/infrastructure/container";

const createEventSchema = z.object({
  title: z.string().min(1),
  description: z.string().default(""),
  gameSystem: z.string().min(1),
  gameSystemId: z.string().nullable().default(null),
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
    title: parsed.data.title,
    description: parsed.data.description,
    gameSystemLabel: parsed.data.gameSystem,
    gameSystemId: parsed.data.gameSystemId,
    startsAt: new Date(parsed.data.startsAt),
    endsAt: new Date(parsed.data.endsAt),
    capacity: parsed.data.capacity,
    entryFeeInCents: parsed.data.entryFeeInCents,
    waitlistEnabled: parsed.data.waitlistEnabled,
    publishImmediately: parsed.data.publishImmediately,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  const event = await container.events.getDetail(result.value.id, DEFAULT_ORGANIZATION_ID);

  return NextResponse.json({ event }, { status: 201 });
}
