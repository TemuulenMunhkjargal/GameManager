import { NextResponse } from "next/server";
import { z } from "zod";
import { announceLeagueParticipant } from "@/application/communications/league-announcements";
import { container, DEFAULT_ORGANIZATION_ID } from "@/infrastructure/container";

const schema = z.object({ memberProfileId: z.string().min(1) });

export async function POST(request: Request, { params }: { params: Promise<{ leagueId: string }> }) {
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Choose an active player." }, { status: 400 });
  const leagueId = (await params).leagueId;
  const result = await container.useCases.enrollLeagueParticipant.execute({
    organizationId: DEFAULT_ORGANIZATION_ID,
    leagueId,
    memberProfileId: parsed.data.memberProfileId,
  });
  if (result.ok) {
    void announceLeagueParticipant(container, DEFAULT_ORGANIZATION_ID, leagueId, result.value.id);
  }
  return result.ok
    ? NextResponse.json({ participant: result.value }, { status: 201 })
    : NextResponse.json({ error: result.error }, { status: 400 });
}
