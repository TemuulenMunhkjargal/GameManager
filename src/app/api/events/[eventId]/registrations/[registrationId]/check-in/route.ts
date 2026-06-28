import { NextResponse } from "next/server";
import { checkInRegistration } from "@/lib/crit-table-store";

type RouteContext = {
  params: Promise<{
    eventId: string;
    registrationId: string;
  }>;
};

export async function POST(_request: Request, context: RouteContext) {
  const { eventId, registrationId } = await context.params;

  try {
    const registration = checkInRegistration(eventId, registrationId);
    return NextResponse.json({ registration });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to check in attendee." },
      { status: 400 },
    );
  }
}

