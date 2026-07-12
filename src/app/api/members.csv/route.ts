import { NextResponse } from "next/server";
import { container, DEFAULT_ORGANIZATION_ID, resolveActor } from "@/infrastructure/container";
import { toCsv } from "@/lib/csv";

export async function GET() {
  const actor = await resolveActor(DEFAULT_ORGANIZATION_ID);

  if (!actor || !actor.membership?.canManageEvents()) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const members = await container.members.listForOrganization(DEFAULT_ORGANIZATION_ID);

  const csv = toCsv(
    ["Name", "Email", "Phone", "Favorite game system", "Status", "Joined at"],
    members.map((m) => [m.displayName, m.email, m.phone, m.favoriteGameSystem, m.status, m.joinedAt]),
  );

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="members.csv"',
    },
  });
}
