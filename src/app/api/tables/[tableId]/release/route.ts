import { NextResponse } from "next/server";
import { container, DEFAULT_ORGANIZATION_ID } from "@/infrastructure/container";

export async function POST(_request: Request, { params }: { params: Promise<{ tableId: string }> }) {
  try {
    await container.tables.releaseTable(DEFAULT_ORGANIZATION_ID, (await params).tableId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to release table." }, { status: 400 });
  }
}
