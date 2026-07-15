import { NextResponse } from "next/server";
import { z } from "zod";
import { container, DEFAULT_ORGANIZATION_ID } from "@/infrastructure/container";

const schema = z.object({ name: z.string().trim().min(1).max(60), capacity: z.number().int().min(1).max(20) });

export async function PATCH(request: Request, { params }: { params: Promise<{ tableId: string }> }) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter a name and 1–20 seats." }, { status: 400 });
  try {
    await container.tables.update(DEFAULT_ORGANIZATION_ID, (await params).tableId, parsed.data.name, parsed.data.capacity);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to update table." }, { status: 400 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ tableId: string }> }) {
  try {
    await container.tables.delete(DEFAULT_ORGANIZATION_ID, (await params).tableId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to delete table." }, { status: 400 });
  }
}
