import { NextResponse } from "next/server";
import { container, DEFAULT_ORGANIZATION_ID } from "@/infrastructure/container";
import { toCsv } from "@/lib/csv";

type RouteContext = { params: Promise<{ leagueId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { leagueId } = await context.params;

  const league = await container.leagues.getDetail(leagueId, DEFAULT_ORGANIZATION_ID);

  if (!league) {
    return NextResponse.json({ error: "League not found." }, { status: 404 });
  }

  const csv = toCsv(
    ["Rank", "Player", "Status", "Played", "Wins", "Losses", "Draws", "Byes", "Points", "Opponent win %", "Rating"],
    league.standings.map((s) => [s.rank, s.memberName, s.status, s.played, s.wins, s.losses, s.draws, s.byes, s.points, s.opponentWinPercentage.toFixed(3), s.rating]),
  );

  const fileName = `${league.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-standings.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${fileName}"`,
    },
  });
}
