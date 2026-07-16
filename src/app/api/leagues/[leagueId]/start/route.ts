import { NextResponse } from "next/server";
import { container, DEFAULT_ORGANIZATION_ID } from "@/infrastructure/container";

type RouteContext = { params: Promise<{ leagueId: string }> };

export async function POST(_req: Request, context: RouteContext) {
  const { leagueId } = await context.params;
  const result = await container.useCases.startLeague.execute({
    organizationId: DEFAULT_ORGANIZATION_ID,
    leagueId,
  });

  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 403 });
  return NextResponse.json({ league: { id: result.value.id, status: result.value.status } });
}
