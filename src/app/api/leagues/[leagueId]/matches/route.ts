import { NextResponse } from "next/server";
import { z } from "zod";
import { container, DEFAULT_ORGANIZATION_ID } from "@/infrastructure/container";

const flexibleSchema = z.object({
  mode: z.literal("head_to_head"),
  firstParticipantId: z.string().min(1),
  secondParticipantId: z.string().min(1),
  winnerParticipantId: z.string().nullable(),
  draw: z.boolean().default(false),
});
const podSchema = z.object({
  mode: z.literal("pod"),
  entries: z.array(z.object({
    participantId: z.string().min(1),
    placement: z.number().int(),
    points: z.number().int(),
  })).min(3).max(20),
});
const schema = z.discriminatedUnion("mode", [flexibleSchema, podSchema]);

export async function POST(request: Request, { params }: { params: Promise<{ leagueId: string }> }) {
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid match result." }, { status: 400 });
  const context = { organizationId: DEFAULT_ORGANIZATION_ID, leagueId: (await params).leagueId };
  const result = parsed.data.mode === "pod"
    ? await container.useCases.recordLeaguePod.execute({ ...context, entries: parsed.data.entries })
    : await container.useCases.recordFlexibleLeagueMatch.execute({
        ...context,
        firstParticipantId: parsed.data.firstParticipantId,
        secondParticipantId: parsed.data.secondParticipantId,
        winnerParticipantId: parsed.data.winnerParticipantId,
        draw: parsed.data.draw,
      });
  return result.ok ? NextResponse.json({ match: result.value }, { status: 201 }) : NextResponse.json({ error: result.error }, { status: 400 });
}
