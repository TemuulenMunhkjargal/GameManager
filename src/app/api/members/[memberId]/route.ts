import { NextResponse } from "next/server";
import { container, DEFAULT_ORGANIZATION_ID } from "@/infrastructure/container";

export async function DELETE(_request: Request, { params }: { params: Promise<{ memberId: string }> }) {
  const memberId = (await params).memberId;
  const tables = await container.tables.listForOrganization(DEFAULT_ORGANIZATION_ID);
  if (tables.some((table) => table.occupants.some((seat) => seat.memberProfileId === memberId))) {
    return NextResponse.json({ error: "Release this player from their table before deleting them." }, { status: 409 });
  }
  const deleted = await container.members.delete(memberId, DEFAULT_ORGANIZATION_ID);
  return deleted ? NextResponse.json({ ok: true }) : NextResponse.json({ error: "Player not found." }, { status: 404 });
}
