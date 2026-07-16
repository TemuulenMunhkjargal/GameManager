import { NextResponse } from "next/server";
import { container, DEFAULT_ORGANIZATION_ID } from "@/infrastructure/container";

type RouteContext = { params: Promise<{ gameSystemId: string }> };

export async function POST(_req: Request, context: RouteContext) {
  const { gameSystemId } = await context.params;
  const result = await container.useCases.archiveGameSystem.execute({
    organizationId: DEFAULT_ORGANIZATION_ID,
    gameSystemId,
  });

  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ gameSystem: { id: result.value.id, status: result.value.status } });
}
