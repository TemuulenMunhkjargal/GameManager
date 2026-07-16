import { NextResponse } from "next/server";
import { announceLeagueCompleted } from "@/application/communications/league-announcements";
import { container, DEFAULT_ORGANIZATION_ID } from "@/infrastructure/container";

export async function POST(_request: Request, { params }: { params: Promise<{ leagueId: string }> }) {
  const leagueId = (await params).leagueId;
  const result = await container.useCases.completeLeague.execute({ organizationId: DEFAULT_ORGANIZATION_ID, leagueId });
  if (result.ok) {
    void announceLeagueCompleted(container, DEFAULT_ORGANIZATION_ID, leagueId);
  }
  return result.ok
    ? NextResponse.json({ ok: true })
    : NextResponse.json({ error: result.error }, { status: 400 });
}
