import { NextResponse } from "next/server";
import { container, DEFAULT_ORGANIZATION_ID, resolveActor } from "@/infrastructure/container";
import { toCsv } from "@/lib/csv";

type RouteContext = { params: Promise<{ leagueId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { leagueId } = await context.params;

  const actor = await resolveActor(DEFAULT_ORGANIZATION_ID);

  if (!actor || !actor.membership?.canManageEvents()) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const league = await container.leagues.getDetail(leagueId, DEFAULT_ORGANIZATION_ID);

  if (!league) {
    return NextResponse.json({ error: "League not found." }, { status: 404 });
  }

  const csv = toCsv(
    ["Player", "Wins", "Losses", "Draws", "Bonus points", "Points"],
    league.standings.map((s) => [s.memberName, s.wins, s.losses, s.draws, s.bonusPoints, s.points]),
  );

  const fileName = `${league.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-standings.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${fileName}"`,
    },
  });
}
