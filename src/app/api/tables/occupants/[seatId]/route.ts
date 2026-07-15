import { NextResponse } from "next/server";
import { container, DEFAULT_ORGANIZATION_ID } from "@/infrastructure/container";

export async function DELETE(_request: Request, { params }: { params: Promise<{ seatId: string }> }) {
  try {
    await container.tables.releaseSeat(DEFAULT_ORGANIZATION_ID, (await params).seatId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to release player." }, { status: 400 });
  }
}
