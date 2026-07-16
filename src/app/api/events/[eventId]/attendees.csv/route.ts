import { NextResponse } from "next/server";
import { container, DEFAULT_ORGANIZATION_ID } from "@/infrastructure/container";
import { toCsv } from "@/lib/csv";

type RouteContext = { params: Promise<{ eventId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { eventId } = await context.params;

  const event = await container.events.getDetail(eventId, DEFAULT_ORGANIZATION_ID);

  if (!event) {
    return NextResponse.json({ error: "Event not found." }, { status: 404 });
  }

  const registrations = await container.registrations.listForEvent(eventId);

  const csv = toCsv(
    ["Name", "Email", "Status", "Payment", "Waitlist position", "Registered at", "Checked in at"],
    registrations.map((r) => [
      r.attendeeName,
      r.attendeeEmail,
      r.status,
      r.paymentStatus ?? "",
      r.waitlistPosition ?? "",
      r.registeredAt,
      r.checkedInAt ?? "",
    ]),
  );

  const fileName = `${event.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-attendees.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${fileName}"`,
    },
  });
}
