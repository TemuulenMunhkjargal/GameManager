export const dynamic = "force-dynamic";

import { Download } from "lucide-react";
import { container, DEFAULT_ORGANIZATION_ID, resolveActor } from "@/infrastructure/container";
import { CreateLeagueForm, StartLeagueButton, RecordResultForm } from "./league-components";

export default async function LeaguesPage() {
  const [leagues, members, actor] = await Promise.all([
    container.leagues.listForOrganization(DEFAULT_ORGANIZATION_ID),
    container.members.listForOrganization(DEFAULT_ORGANIZATION_ID),
    resolveActor(DEFAULT_ORGANIZATION_ID),
  ]);

  const canManage = actor?.membership?.canManageEvents() ?? false;

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

      {leagues.length === 0 ? (
        <p className="notice">No leagues yet. Create one to start tracking standings.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {leagues.map((league) => (
            <section className="panel detail-panel" key={league.id}>
              <div className="topbar" style={{ marginBottom: 12 }}>
                <div>
                  <p className="eyebrow">{league.gameSystemLabel}</p>
                  <h2 style={{ margin: 0 }}>{league.name}</h2>
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

              {canManage && league.status === "active" && members.length > 0 ? (
                <RecordResultForm league={league} members={members} />
              ) : null}
            </section>
          ))}
        </div>
      )}
    </>
  );
}
