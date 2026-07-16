import { NextResponse } from "next/server";
import { z } from "zod";
import { container, DEFAULT_ORGANIZATION_ID } from "@/infrastructure/container";

type RouteContext = { params: Promise<{ eventId: string }> };

const schema = z.object({
  subject: z.string().min(1, "Subject is required."),
  body: z.string().min(1, "Message body is required."),
  scheduledFor: z.string().nullable().optional(),
});

export async function GET(_req: Request, context: RouteContext) {
  const { eventId } = await context.params;
  const list = await container.announcements.listForEvent(eventId, DEFAULT_ORGANIZATION_ID);
  return NextResponse.json({ announcements: list });
}

export async function POST(req: Request, context: RouteContext) {
  const { eventId } = await context.params;
  const body = await req.json();
  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid announcement.", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const result = await container.useCases.sendEventAnnouncement.execute({
    organizationId: DEFAULT_ORGANIZATION_ID,
    eventId,
    subject: parsed.data.subject,
    body: parsed.data.body,
    scheduledFor: parsed.data.scheduledFor ? new Date(parsed.data.scheduledFor) : null,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json(
    {
      announcement: {
        id: result.value.id,
        status: result.value.status,
        deliveredToDiscord: result.value.status === "sent",
      },
    },
    { status: 201 },
  );
}
