import { NextResponse } from "next/server";
import { z } from "zod";
import { container, DEFAULT_ORGANIZATION_ID } from "@/infrastructure/container";

const schema = z.object({ memberProfileId: z.string().nullable().optional(), guestName: z.string().trim().max(80).nullable().optional() });

export async function POST(request: Request, { params }: { params: Promise<{ tableId: string }> }) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid player details." }, { status: 400 });
  try {
    await container.tables.seat({ organizationId: DEFAULT_ORGANIZATION_ID,
      tableId: (await params).tableId, ...parsed.data });
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to seat player." }, { status: 400 });
  }
}
