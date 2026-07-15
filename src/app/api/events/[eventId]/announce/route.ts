import { NextResponse } from "next/server";
import { z } from "zod";
import { container, DEFAULT_ORGANIZATION_ID, resolveActor } from "@/infrastructure/container";

type RouteContext = { params: Promise<{ eventId: string }> };

const schema = z.object({
  subject: z.string().min(1, "Subject is required."),
  body: z.string().min(1, "Message body is required."),
  audience: z.enum(["confirmed_attendees", "waitlisted", "all_attendees"]),
  notifyDiscord: z.boolean().default(false),
  scheduledFor: z.string().nullable().optional(),
});

export async function GET(_req: Request, context: RouteContext) {
  const { eventId } = await context.params;
  const actor = await resolveActor(DEFAULT_ORGANIZATION_ID);

  if (!actor) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const list = await container.announcements.listForEvent(eventId, DEFAULT_ORGANIZATION_ID);
  return NextResponse.json({ announcements: list });
}

export async function POST(req: Request, context: RouteContext) {
  const { eventId } = await context.params;
  const actor = await resolveActor(DEFAULT_ORGANIZATION_ID);

  if (!actor) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

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
    actorMembership: actor.membership,
    eventId,
    subject: parsed.data.subject,
    body: parsed.data.body,
    audience: parsed.data.audience,
    notifyDiscord: parsed.data.notifyDiscord,
    scheduledFor: parsed.data.scheduledFor ? new Date(parsed.data.scheduledFor) : null,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 403 });
  }

  return NextResponse.json(
    {
      announcement: {
        id: result.value.id,
        status: result.value.status,
        recipientCount: result.value.recipientCount,
      },
    },
    { status: 201 },
  );
}
