import { NextResponse } from "next/server";
import { container, DEFAULT_ORGANIZATION_ID } from "@/infrastructure/container";

export async function DELETE(_request: Request, { params }: { params: Promise<{ leagueId: string; adjustmentId: string }> }) {
  const { leagueId, adjustmentId } = await params;
  const result = await container.useCases.deleteLeagueAdjustment.execute({
    organizationId: DEFAULT_ORGANIZATION_ID,
    leagueId,
    adjustmentId,
  });
  return result.ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: result.error }, { status: 400 });
}
