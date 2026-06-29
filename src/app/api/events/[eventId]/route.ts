import { NextResponse } from "next/server";
import { container, DEFAULT_ORGANIZATION_ID } from "@/infrastructure/container";

type RouteContext = {
  params: Promise<{
    eventId: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { eventId } = await context.params;
  const event = await container.events.getDetail(eventId, DEFAULT_ORGANIZATION_ID);

  if (!event) {
    return NextResponse.json({ error: "Event not found." }, { status: 404 });
  }

  const registrations = await container.registrations.listForEvent(eventId);

  return NextResponse.json({ event, registrations });
}
