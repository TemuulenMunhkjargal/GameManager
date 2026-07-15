import { NextResponse } from "next/server";
import { container, DEFAULT_ORGANIZATION_ID } from "@/infrastructure/container";

export async function DELETE(_request: Request, { params }: { params: Promise<{ leagueId: string }> }) {
  const deleted = await container.leagues.delete((await params).leagueId, DEFAULT_ORGANIZATION_ID);
  return deleted ? NextResponse.json({ ok: true }) : NextResponse.json({ error: "League not found." }, { status: 404 });
}
