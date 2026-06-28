import { NextResponse } from "next/server";
import { z } from "zod";
import { registerForEvent } from "@/lib/crit-table-store";

type RouteContext = {
  params: Promise<{
    eventId: string;
  }>;
};

const registerSchema = z.object({
  attendeeName: z.string().min(1, "Name is required."),
  attendeeEmail: z.string().email("A valid email is required."),
});

export async function POST(request: Request, context: RouteContext) {
  const { eventId } = await context.params;
  const body = await request.json();
  const parsed = registerSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid registration details.", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const registration = registerForEvent(eventId, parsed.data);
    return NextResponse.json({ registration }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to register." },
      { status: 400 },
    );
  }
}

