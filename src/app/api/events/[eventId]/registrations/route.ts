import { NextResponse } from "next/server";
import { z } from "zod";
import { container, DEFAULT_ORGANIZATION_ID } from "@/infrastructure/container";

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

  const result = await container.useCases.registerGuestForEvent.execute({
    organizationId: DEFAULT_ORGANIZATION_ID,
    eventId,
    attendeeName: parsed.data.attendeeName,
    attendeeEmail: parsed.data.attendeeEmail,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  if (result.value.kind === "waitlisted") {
    return NextResponse.json(
      {
        outcome: "waitlisted",
        waitlistEntry: {
          id: result.value.waitlistEntry.id,
          position: result.value.waitlistEntry.position,
        },
      },
      { status: 201 },
    );
  }

  return NextResponse.json(
    {
      outcome: "confirmed",
      registration: { id: result.value.registration.id, status: result.value.registration.status },
    },
    { status: 201 },
  );
}
