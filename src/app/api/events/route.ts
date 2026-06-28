import { NextResponse } from "next/server";
import { z } from "zod";
import { createEvent, listEvents } from "@/lib/crit-table-store";

const createEventSchema = z.object({
  title: z.string().min(1),
  description: z.string().default(""),
  gameSystem: z.string().min(1),
  venueName: z.string().min(1),
  roomName: z.string().optional().nullable(),
  startsAt: z.string().min(1),
  endsAt: z.string().min(1),
  capacity: z.coerce.number().int().min(1).max(999),
  entryFeeInCents: z.coerce.number().int().min(0).max(100000),
  waitlistEnabled: z.boolean(),
});

export function GET() {
  return NextResponse.json({ events: listEvents() });
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

  try {
    const event = createEvent(parsed.data);
    return NextResponse.json({ event }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to create event." },
      { status: 400 },
    );
  }
}

