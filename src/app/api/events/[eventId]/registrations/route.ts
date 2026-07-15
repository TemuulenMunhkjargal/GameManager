import { NextResponse } from "next/server";
import { z } from "zod";
import { container, DEFAULT_ORGANIZATION_ID } from "@/infrastructure/container";

const schema = z.object({ memberProfileId: z.string().min(1) });

export async function POST(request: Request, { params }: { params: Promise<{ eventId: string }> }) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Choose a player." }, { status: 400 });
  const result = await container.useCases.registerForEvent.execute({
    organizationId: DEFAULT_ORGANIZATION_ID,
    eventId: (await params).eventId,
    memberProfileId: parsed.data.memberProfileId,
  });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ outcome: result.value.kind, id: result.value.id }, { status: 201 });
}
