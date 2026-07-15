import { NextResponse } from "next/server";
import { z } from "zod";
import { container, DEFAULT_ORGANIZATION_ID } from "@/infrastructure/container";

const schema = z.object({ targetTableId: z.string().min(1) });

export async function POST(request: Request, { params }: { params: Promise<{ seatId: string }> }) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Choose a destination table." }, { status: 400 });
  try {
    await container.tables.move(DEFAULT_ORGANIZATION_ID, (await params).seatId, parsed.data.targetTableId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to move player." }, { status: 400 });
  }
}
