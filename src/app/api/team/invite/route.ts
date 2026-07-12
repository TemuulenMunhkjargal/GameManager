import { NextResponse } from "next/server";
import { z } from "zod";
import { APP_BASE_URL, container, DEFAULT_ORGANIZATION_ID, resolveActor } from "@/infrastructure/container";

const inviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(["admin", "event_manager", "staff", "viewer"]),
});

export async function POST(request: Request) {
  const actor = await resolveActor(DEFAULT_ORGANIZATION_ID);

  if (!actor) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const body = await request.json();
  const parsed = inviteSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid invitation details.", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const settings = await container.settings.get(DEFAULT_ORGANIZATION_ID);

  const result = await container.useCases.inviteTeammate.execute({
    organizationId: DEFAULT_ORGANIZATION_ID,
    actorMembership: actor.membership,
    organizationName: settings?.name ?? "the store",
    email: parsed.data.email,
    role: parsed.data.role,
    appBaseUrl: APP_BASE_URL,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 403 });
  }

  return NextResponse.json(
    { membership: { id: result.value.id, status: result.value.status } },
    { status: 201 },
  );
}
