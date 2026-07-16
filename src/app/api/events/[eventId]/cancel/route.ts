import { NextResponse } from "next/server";
import { container, DEFAULT_ORGANIZATION_ID } from "@/infrastructure/container";

type RouteContext = { params: Promise<{ eventId: string }> };

export async function POST(_req: Request, context: RouteContext) {
  const { eventId } = await context.params;
  const result = await container.useCases.cancelEvent.execute({
    organizationId: DEFAULT_ORGANIZATION_ID,
    eventId,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 403 });
  }

  return NextResponse.json({ event: { id: result.value.id, status: result.value.status } });
}
