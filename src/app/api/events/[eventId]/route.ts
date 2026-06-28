import { NextResponse } from "next/server";
import { getEvent, listRegistrations } from "@/lib/crit-table-store";

type RouteContext = {
  params: Promise<{
    eventId: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { eventId } = await context.params;
  const event = getEvent(eventId);

  if (!event) {
    return NextResponse.json({ error: "Event not found." }, { status: 404 });
  }

  return NextResponse.json({
    event,
    registrations: listRegistrations(eventId),
  });
}

