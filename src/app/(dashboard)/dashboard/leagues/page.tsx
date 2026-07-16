export const dynamic = "force-dynamic";

import { Download } from "lucide-react";
import { container, DEFAULT_ORGANIZATION_ID } from "@/infrastructure/container";
import {
  CompleteLeagueButton,
  CreateLeagueForm,
  DeleteAdjustmentButton,
  DeleteLeagueButton,
  FlexibleMatchForm,
  MatchResultEditor,
  PodResultForm,
  PointsAdjustmentForm,
  RosterManager,
  StartLeagueButton,
  VoidResultButton,
} from "./league-components";
import { ScheduleCalendar } from "../schedule-calendar";
import { ScheduleViewToggle } from "../schedule-view-toggle";
import { getLeagueFormat } from "@/lib/league-formats";

export default async function LeaguesPage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const [leagues, members] = await Promise.all([
    container.leagues.listForOrganization(DEFAULT_ORGANIZATION_ID),
    container.members.listForOrganization(DEFAULT_ORGANIZATION_ID),
  ]);
  const view = (await searchParams).view === "calendar" ? "calendar" : "list";

  return <>
    <div className="topbar"><div><p className="eyebrow">Competitive play</p><h1 className="page-title">Leagues</h1><p className="page-copy">Enroll a roster, generate real pairings and brackets, record match history, and calculate standings from the results.</p></div><CreateLeagueForm /></div>
    <div className="toolbar"><h2>League schedule</h2><ScheduleViewToggle view={view} /></div>
    {view === "calendar" ? <ScheduleCalendar emptyCopy="Add start dates to your leagues to see them here." items={leagues.filter((league) => league.startsAt).map((league) => ({ id: league.id, title: league.name, start: league.startsAt!, end: league.endsAt, label: league.gameSystemLabel }))} /> : leagues.length === 0 ? <p className="notice">No leagues yet. Create one, enroll players, and choose a competition format.</p> : <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {leagues.map((league) => {
        const format = getLeagueFormat(league.format);
        const lateRoster = league.status === "active" && format.allowsLateEnrollment;
        const showRecord = format.pairingMode !== "points";
        const showOmw = ["match_play", "round_robin", "double_round_robin", "swiss", "swiss_top_cut"].includes(league.format);
        return <section className="panel detail-panel" key={league.id}>
          <div className="topbar" style={{ marginBottom: 12 }}><div><p className="eyebrow">{league.gameSystemLabel}</p><h2 style={{ margin: 0 }}>{league.name}</h2><div className="league-format-summary"><span className="badge">{format.label}</span><span>{format.summary}</span><span className="badge">{league.phase}</span></div><p className="league-format-copy">{format.explanation}</p>{league.description ? <p className="muted">{league.description}</p> : null}</div><div className="form-actions"><span className={league.status === "active" ? "badge" : league.status === "completed" ? "badge warning" : "badge danger"}>{league.status}</span>{league.status === "draft" ? <StartLeagueButton leagueId={league.id} /> : null}{league.standings.length ? <a className="button secondary" href={`/api/leagues/${league.id}/standings.csv`}><Download aria-hidden="true" size={16} /> Export CSV</a> : null}{league.status === "active" ? <CompleteLeagueButton leagueId={league.id} /> : null}<DeleteLeagueButton leagueId={league.id} name={league.name} /></div></div>

          {(league.status === "draft" || lateRoster) ? <RosterManager league={league} members={members} /> : null}

          {league.standings.length ? <div style={{ overflowX: "auto", marginTop: 16 }}><table style={{ width: "100%" }}><thead><tr><th>Rank</th><th style={{ textAlign: "left" }}>Player</th><th>Status</th>{showRecord ? <><th>GP</th><th>W</th><th>L</th><th>D</th></> : null}<th>Pts</th>{showOmw ? <th>OMW%</th> : null}{league.format === "ladder" ? <th>Rating</th> : null}</tr></thead><tbody>{league.standings.map((standing) => <tr key={standing.participantId}><td style={{ textAlign: "center" }}>{standing.rank}</td><td>{standing.memberName}</td><td style={{ textAlign: "center" }}><span className="badge">{standing.status}</span></td>{showRecord ? <><td style={{ textAlign: "center" }}>{standing.played}</td><td style={{ textAlign: "center" }}>{standing.wins}</td><td style={{ textAlign: "center" }}>{standing.losses}</td><td style={{ textAlign: "center" }}>{standing.draws}</td></> : null}<td style={{ textAlign: "center" }}><strong>{standing.points}</strong></td>{showOmw ? <td style={{ textAlign: "center" }}>{(standing.opponentWinPercentage * 100).toFixed(1)}%</td> : null}{league.format === "ladder" ? <td style={{ textAlign: "center" }}>{standing.rating}</td> : null}</tr>)}</tbody></table></div> : <p className="muted" style={{ marginTop: 16 }}>{league.participantCount ? "Standings will appear when play starts." : "Enroll players to build the standings."}</p>}

          {league.rounds.length ? <div style={{ display: "grid", gap: 12, marginTop: 18 }}><h3 style={{ margin: 0 }}>Rounds and pairings</h3>{league.rounds.map((round) => <section className="panel" key={round.id}><div className="toolbar"><div><strong>{round.label}</strong><p className="muted" style={{ margin: "3px 0 0" }}>{round.stage.replaceAll("_", " ")}</p></div><span className="badge">{round.status}</span></div><div style={{ display: "grid", gap: 10 }}>{round.matches.map((match) => <div className="toolbar" key={match.id} style={{ alignItems: "center" }}><div><strong>{match.label}</strong><p style={{ margin: "4px 0 0" }}>{match.entries.map((entry) => `${entry.memberName}${entry.outcome === "bye" ? " (bye)" : entry.outcome ? ` · ${entry.outcome}` : ""}`).join(" vs. ")}</p></div>{league.status === "active" && match.canEdit ? <MatchResultEditor allowDraw={league.format !== "single_elimination" && league.format !== "double_elimination" && match.stage !== "top_cut" && match.stage !== "final"} leagueId={league.id} match={match} /> : <span className="badge">{match.status}</span>}</div>)}</div></section>)}</div> : null}

          {league.status === "active" && league.participantCount >= format.minimumParticipants ? <div className="panel" style={{ marginTop: 16 }}><h3 style={{ marginTop: 0 }}>{format.pairingMode === "pod" ? "Record a pod" : format.pairingMode === "points" ? "Record points" : format.pairingMode === "manual" || format.pairingMode === "ladder" ? "Record a matchup" : "Competition controls"}</h3>{format.pairingMode === "pod" ? <PodResultForm league={league} /> : format.pairingMode === "points" ? <PointsAdjustmentForm league={league} /> : format.pairingMode === "manual" || format.pairingMode === "ladder" ? <FlexibleMatchForm league={league} /> : <p className="muted">Pairings advance automatically when every match in the active round has a result.</p>}</div> : null}

          {league.ungroupedMatches.filter((match) => match.status !== "void").length ? <div style={{ display: "grid", gap: 10, marginTop: 18 }}><h3 style={{ margin: 0 }}>Match and session history</h3>{league.ungroupedMatches.filter((match) => match.status !== "void").map((match) => <details className="panel" key={match.id}><summary><strong>{match.label}</strong> · {match.entries.map((entry) => entry.memberName).join(", ")}</summary><div style={{ marginTop: 12 }}>{league.status === "active" && match.stage === "pod" ? <PodResultForm league={league} match={match} /> : league.status === "active" && match.entries.length === 2 ? <MatchResultEditor leagueId={league.id} match={match} /> : <p className="muted">{match.entries.map((entry) => `${entry.memberName}: ${entry.score ?? entry.outcome ?? "recorded"}`).join(" · ")}</p>}{league.status === "active" ? <VoidResultButton leagueId={league.id} matchId={match.id} /> : null}</div></details>)}</div> : null}

          {league.adjustments.length ? <div style={{ marginTop: 18 }}><h3>Point history</h3><div style={{ display: "grid", gap: 8 }}>{league.adjustments.map((adjustment) => <div className="toolbar panel" key={adjustment.id}><div><strong>{adjustment.memberName}: {adjustment.points > 0 ? "+" : ""}{adjustment.points}</strong><p className="muted" style={{ margin: "3px 0 0" }}>{adjustment.reason}</p></div>{adjustment.canDelete ? <DeleteAdjustmentButton adjustmentId={adjustment.id} leagueId={league.id} /> : null}</div>)}</div></div> : null}
        </section>;
      })}
    </div>}
  </>;
}
