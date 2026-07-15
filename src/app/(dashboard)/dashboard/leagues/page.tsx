export const dynamic = "force-dynamic";

import { Download } from "lucide-react";
import { container, DEFAULT_ORGANIZATION_ID, resolveActor } from "@/infrastructure/container";
import { AwardPointsForm, CompleteLeagueButton, CreateLeagueForm, StartLeagueButton, RecordResultForm, DeleteLeagueButton } from "./league-components";
import { ScheduleCalendar } from "../schedule-calendar";
import { ScheduleViewToggle } from "../schedule-view-toggle";
import { getLeagueFormat } from "@/lib/league-formats";

export default async function LeaguesPage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const [leagues, members, actor] = await Promise.all([
    container.leagues.listForOrganization(DEFAULT_ORGANIZATION_ID),
    container.members.listForOrganization(DEFAULT_ORGANIZATION_ID),
    resolveActor(DEFAULT_ORGANIZATION_ID),
  ]);

  const canManage = actor?.membership?.canManageEvents() ?? false;
  const view = (await searchParams).view === "calendar" ? "calendar" : "list";

  return (
    <>
      <div className="topbar">
        <div>
          <p className="eyebrow">Competitive play</p>
          <h1 className="page-title">Leagues</h1>
          <p className="page-copy">
            Run recurring competitive structures with standings tied to your members and game
            systems.
          </p>
        </div>
        {canManage ? <CreateLeagueForm /> : null}
      </div>

      <div className="toolbar"><h2>League schedule</h2><ScheduleViewToggle view={view} /></div>

      {view === "calendar" ? (
        <ScheduleCalendar emptyCopy="Add start dates to your leagues to see them here." items={leagues.filter((league) => league.startsAt).map((league) => ({ id: league.id, title: league.name, start: league.startsAt!, end: league.endsAt, label: league.gameSystemLabel }))} />
      ) : leagues.length === 0 ? (
        <p className="notice">No leagues yet. Create one to start tracking standings.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {leagues.map((league) => (
            <section className="panel detail-panel" key={league.id}>
              <div className="topbar" style={{ marginBottom: 12 }}>
                <div>
                  <p className="eyebrow">{league.gameSystemLabel}</p>
                  <h2 style={{ margin: 0 }}>{league.name}</h2>
                  <div className="league-format-summary">
                    <span className="badge">{getLeagueFormat(league.format).label}</span>
                    <span>{getLeagueFormat(league.format).summary}</span>
                  </div>
                  <p className="league-format-copy">{getLeagueFormat(league.format).explanation}</p>
                  {league.description ? <p className="muted">{league.description}</p> : null}
                </div>
                <div className="form-actions">
                  <span
                    className={
                      league.status === "active"
                        ? "badge"
                        : league.status === "completed"
                          ? "badge warning"
                          : "badge danger"
                    }
                  >
                    {league.status}
                  </span>
                  {canManage && league.status === "draft" ? (
                    <StartLeagueButton leagueId={league.id} />
                  ) : null}
                  {league.standings.length > 0 ? (
                    <a className="button secondary" href={`/api/leagues/${league.id}/standings.csv`}>
                      <Download aria-hidden="true" size={16} />
                      Export CSV
                    </a>
                  ) : null}
                  {canManage && league.status === "active" ? <CompleteLeagueButton leagueId={league.id} /> : null}
                  {canManage ? <DeleteLeagueButton leagueId={league.id} name={league.name} /> : null}
                </div>
              </div>

              {league.standings.length > 0 ? (
                <table style={{ width: "100%", marginBottom: canManage && league.status === "active" ? 16 : 0 }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: "left" }}>Player</th>
                      <th>W</th>
                      <th>L</th>
                      <th>D</th>
                      {league.standings.some((standing) => standing.bonusPoints !== 0) ? <th>Bonus</th> : null}
                      <th>Points</th>
                    </tr>
                  </thead>
                  <tbody>
                    {league.standings.map((s) => (
                      <tr key={s.id}>
                        <td>{s.memberName}</td>
                        <td style={{ textAlign: "center" }}>{s.wins}</td>
                        <td style={{ textAlign: "center" }}>{s.losses}</td>
                        <td style={{ textAlign: "center" }}>{s.draws}</td>
                        {league.standings.some((standing) => standing.bonusPoints !== 0) ? <td style={{ textAlign: "center" }}>{s.bonusPoints}</td> : null}
                        <td style={{ textAlign: "center" }}>
                          <strong>{s.points}</strong>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="muted">No results recorded yet.</p>
              )}

              {canManage && league.status === "active" && members.some((member) => member.status === "active") ? (
                getLeagueFormat(league.format).resultMode === "points"
                  ? <AwardPointsForm league={league} members={members.filter((member) => member.status === "active")} />
                  : members.filter((member) => member.status === "active").length > 1
                    ? <RecordResultForm league={league} members={members.filter((member) => member.status === "active")} />
                    : <p className="muted">Add at least two active players to record a matchup.</p>
              ) : null}
            </section>
          ))}
        </div>
      )}
    </>
  );
}
