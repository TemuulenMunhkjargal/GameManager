import { NextResponse } from "next/server";
import { z } from "zod";
import { container, DEFAULT_ORGANIZATION_ID } from "@/infrastructure/container";

const headToHeadSchema = z.object({
  mode: z.literal("head_to_head").default("head_to_head"),
  winnerParticipantId: z.string().nullable(),
  draw: z.boolean().default(false),
  scores: z.record(z.string(), z.number().int().min(0).max(999)).optional(),
});
const podSchema = z.object({
  mode: z.literal("pod"),
  entries: z.array(z.object({ participantId: z.string().min(1), placement: z.number().int(), points: z.number().int() })).min(3).max(20),
});
const resultSchema = z.union([headToHeadSchema, podSchema]);

export async function PATCH(request: Request, { params }: { params: Promise<{ leagueId: string; matchId: string }> }) {
  const parsed = resultSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid match result." }, { status: 400 });
  const { leagueId, matchId } = await params;
  const context = { organizationId: DEFAULT_ORGANIZATION_ID, leagueId, matchId };
  const result = parsed.data.mode === "pod"
    ? await container.useCases.recordLeaguePod.execute({ ...context, entries: parsed.data.entries })
    : await container.useCases.recordLeagueMatch.execute({ ...context, winnerParticipantId: parsed.data.winnerParticipantId, draw: parsed.data.draw, scores: parsed.data.scores });
  return result.ok ? NextResponse.json({ match: result.value }) : NextResponse.json({ error: result.error }, { status: 400 });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ leagueId: string; matchId: string }> }) {
  const { leagueId, matchId } = await params;
  const result = await container.useCases.voidLeagueMatch.execute({
    organizationId: DEFAULT_ORGANIZATION_ID,
    leagueId,
    matchId,
  });
  return result.ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: result.error }, { status: 400 });
}
