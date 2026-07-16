"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Play, Plus, Trash2, Trophy, X } from "lucide-react";
import type { LeagueMatchDTO, LeagueSummaryDTO } from "@/application/leagues/ports";
import type { MemberSummaryDTO } from "@/application/members/ports";
import type { LeagueFormat } from "@/domain/leagues/league";
import { getLeagueFormat, LEAGUE_FORMATS } from "@/lib/league-formats";
import { messageFromRequestError, requestJson } from "@/lib/api-client";

function ActionError({ message }: { message: string | null }) {
  return message ? <p className="notice error" style={{ marginTop: 8 }}>{message}</p> : null;
}

export function CreateLeagueForm() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [format, setFormat] = useState<LeagueFormat>("match_play");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const definition = getLeagueFormat(format);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true); setError(null);
    try {
      await requestJson("/api/leagues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.get("name"),
          gameSystemLabel: form.get("gameSystemLabel") || "Other",
          format,
          description: form.get("description") || "",
          startsAt: form.get("startsAt") ? `${form.get("startsAt")}T12:00:00` : null,
          endsAt: form.get("endsAt") ? `${form.get("endsAt")}T12:00:00` : null,
          configuredRounds: form.get("configuredRounds") ? Number(form.get("configuredRounds")) : 0,
          topCutSize: Number(form.get("topCutSize") || 4),
        }),
      });
      setIsOpen(false); router.refresh();
    } catch (caught) { setError(messageFromRequestError(caught, "Unable to create league.")); }
    finally { setBusy(false); }
  }

  if (!isOpen) return <button className="button" onClick={() => setIsOpen(true)} type="button"><Plus size={18} /> New league</button>;
  return (
    <div className="panel form-panel" style={{ marginBottom: 24 }}>
      <div className="topbar" style={{ marginBottom: 12 }}><h3 style={{ margin: 0 }}>Create league</h3><button aria-label="Close" className="button secondary" onClick={() => setIsOpen(false)} type="button"><X size={16} /></button></div>
      <form className="form-grid" onSubmit={submit}>
        <div className="field"><label htmlFor="league-name">Name</label><input id="league-name" name="name" required /></div>
        <div className="field"><label htmlFor="league-game">Game system</label><input id="league-game" name="gameSystemLabel" placeholder="Magic, Pokemon, Warhammer..." /></div>
        <div className="field full"><label htmlFor="league-format">Competition format</label><select id="league-format" value={format} onChange={(event) => setFormat(event.target.value as LeagueFormat)}>{LEAGUE_FORMATS.map((option) => <option key={option.value} value={option.value}>{option.label} — {option.summary}</option>)}</select><div className="league-format-explainer"><strong>{definition.label}</strong><span>{definition.explanation}</span><small>Minimum {definition.minimumParticipants} participant{definition.minimumParticipants === 1 ? "" : "s"}. {definition.allowsLateEnrollment ? "Late enrollment is allowed." : "The roster locks when play starts."}</small></div></div>
        {(format === "swiss" || format === "swiss_top_cut") ? <div className="field"><label htmlFor="league-rounds">Swiss rounds</label><input id="league-rounds" max={20} min={0} name="configuredRounds" type="number" defaultValue={0} /><small>0 chooses the recommended count from roster size.</small></div> : null}
        {format === "swiss_top_cut" ? <div className="field"><label htmlFor="league-cut">Top Cut</label><select defaultValue="4" id="league-cut" name="topCutSize"><option value="2">Top 2</option><option value="4">Top 4</option><option value="8">Top 8</option><option value="16">Top 16</option></select></div> : null}
        <div className="field full"><label htmlFor="league-description">Description</label><textarea id="league-description" name="description" rows={2} /></div>
        <div className="field"><label htmlFor="league-starts">Starts</label><input id="league-starts" name="startsAt" type="date" /></div>
        <div className="field"><label htmlFor="league-ends">Ends</label><input id="league-ends" name="endsAt" type="date" /></div>
        <div className="full"><ActionError message={error} /></div>
        <div className="form-actions full"><button className="button" disabled={busy} type="submit">{busy ? "Creating…" : "Create league"}</button></div>
      </form>
    </div>
  );
}

export function RosterManager({ league, members }: { league: LeagueSummaryDTO; members: MemberSummaryDTO[] }) {
  const router = useRouter();
  const available = members.filter((member) => member.status === "active" && !league.participants.some((participant) => participant.memberProfileId === member.id));
  const [memberId, setMemberId] = useState(available[0]?.id ?? "");
  const selectedMemberId = available.some((member) => member.id === memberId) ? memberId : available[0]?.id ?? "";
  const [busy, setBusy] = useState(false); const [error, setError] = useState<string | null>(null);
  async function add() {
    setBusy(true); setError(null);
    try { await requestJson(`/api/leagues/${league.id}/participants`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ memberProfileId: selectedMemberId }) }); router.refresh(); }
    catch (caught) { setError(messageFromRequestError(caught, "Unable to enroll player.")); }
    finally { setBusy(false); }
  }
  async function remove(participantId: string) {
    setBusy(true); setError(null);
    try { await requestJson(`/api/leagues/${league.id}/participants/${participantId}`, { method: "DELETE" }); router.refresh(); }
    catch (caught) { setError(messageFromRequestError(caught, "Unable to remove player.")); }
    finally { setBusy(false); }
  }
  return <div className="panel" style={{ marginTop: 12 }}><div className="toolbar"><div><h3 style={{ margin: 0 }}>Roster</h3><p className="muted" style={{ margin: "4px 0 0" }}>{league.participantCount} active · seed order determines initial pairings</p></div>{available.length ? <div className="inline-line"><select aria-label="Player to enroll" value={selectedMemberId} onChange={(event) => setMemberId(event.target.value)}>{available.map((member) => <option key={member.id} value={member.id}>{member.displayName}</option>)}</select><button className="button secondary" disabled={busy || !selectedMemberId} onClick={add} type="button"><Plus size={15} /> Enroll</button></div> : null}</div><div className="form-actions" style={{ justifyContent: "flex-start" }}>{league.participants.map((participant) => <span className="badge" key={participant.id}>#{participant.seed} {participant.memberName}{participant.status === "withdrawn" ? " (withdrawn)" : ""}{participant.canRemove ? <button aria-label={`${league.status === "draft" ? "Remove" : "Withdraw"} ${participant.memberName}`} className="icon-button danger-icon" disabled={busy} onClick={() => remove(participant.id)} type="button"><X size={13} /></button> : null}</span>)}</div>{league.participants.length === 0 ? <p className="muted">Enroll players before starting. Only enrolled players can receive pairings or points.</p> : null}<ActionError message={error} /></div>;
}

function BusyButton({ action, confirm, children, className = "button" }: { action: () => Promise<void>; confirm?: string; children: React.ReactNode; className?: string }) {
  const [busy, setBusy] = useState(false); const [error, setError] = useState<string | null>(null);
  async function run() { if (confirm && !window.confirm(confirm)) return; setBusy(true); setError(null); try { await action(); } catch (caught) { setError(messageFromRequestError(caught, "Unable to complete action.")); } finally { setBusy(false); } }
  return <div><button className={className} disabled={busy} onClick={run} type="button">{children}</button><ActionError message={error} /></div>;
}

export function StartLeagueButton({ leagueId }: { leagueId: string }) { const router = useRouter(); return <BusyButton action={async () => { await requestJson(`/api/leagues/${leagueId}/start`, { method: "POST" }); router.refresh(); }}><Play size={16} /> Start competition</BusyButton>; }
export function CompleteLeagueButton({ leagueId }: { leagueId: string }) { const router = useRouter(); return <BusyButton action={async () => { await requestJson(`/api/leagues/${leagueId}/complete`, { method: "POST" }); router.refresh(); }} className="button secondary" confirm="Complete this league? Results will become read-only."><Trophy size={16} /> Complete</BusyButton>; }
export function DeleteLeagueButton({ leagueId, name }: { leagueId: string; name: string }) { const router = useRouter(); return <BusyButton action={async () => { await requestJson(`/api/leagues/${leagueId}`, { method: "DELETE" }); router.refresh(); }} className="icon-button danger-icon" confirm={`Delete ${name} and all of its competition history?`}><Trash2 size={16} /></BusyButton>; }

export function MatchResultEditor({ leagueId, match, allowDraw = true }: { leagueId: string; match: LeagueMatchDTO; allowDraw?: boolean }) {
  const router = useRouter(); const [draw, setDraw] = useState(match.entries.every((entry) => entry.outcome === "draw"));
  const currentWinner = match.entries.find((entry) => entry.outcome === "win")?.participantId ?? match.entries[0]?.participantId ?? "";
  const [winner, setWinner] = useState(currentWinner); const [busy, setBusy] = useState(false); const [error, setError] = useState<string | null>(null);
  if (match.entries.length !== 2) return null;
  async function save() { setBusy(true); setError(null); try { await requestJson(`/api/leagues/${leagueId}/matches/${match.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode: "head_to_head", winnerParticipantId: draw ? null : winner, draw }) }); router.refresh(); } catch (caught) { setError(messageFromRequestError(caught, "Unable to record result.")); } finally { setBusy(false); } }
  return <div><div className="inline-line"><select aria-label="Match result" disabled={busy} value={allowDraw && draw ? "draw" : winner} onChange={(event) => { setDraw(event.target.value === "draw"); if (event.target.value !== "draw") setWinner(event.target.value); }}>{allowDraw ? <option value="draw">Draw</option> : null}{match.entries.map((entry) => <option key={entry.participantId} value={entry.participantId}>{entry.memberName} wins</option>)}</select><button className="button secondary" disabled={busy} onClick={save} type="button">{busy ? "Saving…" : match.status === "completed" ? "Correct result" : "Record result"}</button></div><ActionError message={error} /></div>;
}

export function FlexibleMatchForm({ league }: { league: LeagueSummaryDTO }) {
  const router = useRouter(); const active = league.participants.filter((participant) => participant.status === "active");
  const [first, setFirst] = useState(active[0]?.id ?? ""); const [second, setSecond] = useState(active[1]?.id ?? ""); const [result, setResult] = useState(active[0]?.id ?? "draw");
  const selectedFirst = active.some((participant) => participant.id === first) ? first : active[0]?.id ?? "";
  const selectedSecond = active.some((participant) => participant.id === second && participant.id !== selectedFirst) ? second : active.find((participant) => participant.id !== selectedFirst)?.id ?? "";
  const selectedResult = result === "draw" || result === selectedFirst || result === selectedSecond ? result : selectedFirst;
  const [busy, setBusy] = useState(false); const [error, setError] = useState<string | null>(null);
  async function submit(event: React.FormEvent) { event.preventDefault(); setBusy(true); setError(null); try { await requestJson(`/api/leagues/${league.id}/matches`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode: "head_to_head", firstParticipantId: selectedFirst, secondParticipantId: selectedSecond, winnerParticipantId: selectedResult === "draw" ? null : selectedResult, draw: selectedResult === "draw" }) }); router.refresh(); } catch (caught) { setError(messageFromRequestError(caught, "Unable to record matchup.")); } finally { setBusy(false); } }
  return <form className="form-grid" onSubmit={submit}><p className="muted full" style={{ margin: 0 }}>{league.format === "ladder" ? "Record a challenge between players within three ladder positions." : "Record a matchup played in any order."}</p><div className="field"><label>Player one</label><select value={selectedFirst} onChange={(event) => { const next = event.target.value; setFirst(next); if (result !== "draw" && result !== next && result !== selectedSecond) setResult(next); }}>{active.map((participant) => <option key={participant.id} value={participant.id}>{participant.memberName}</option>)}</select></div><div className="field"><label>Player two</label><select value={selectedSecond} onChange={(event) => { const next = event.target.value; setSecond(next); if (result !== "draw" && result !== selectedFirst && result !== next) setResult(selectedFirst); }}>{active.filter((participant) => participant.id !== selectedFirst).map((participant) => <option key={participant.id} value={participant.id}>{participant.memberName}</option>)}</select></div><div className="field"><label>Result</label><select value={selectedResult} onChange={(event) => setResult(event.target.value)}><option value="draw">Draw</option>{[selectedFirst, selectedSecond].filter(Boolean).map((id) => <option key={id} value={id}>{active.find((participant) => participant.id === id)?.memberName} wins</option>)}</select></div><div className="full"><ActionError message={error} /></div><div className="form-actions full"><button className="button" disabled={busy || !selectedFirst || !selectedSecond || selectedFirst === selectedSecond} type="submit"><Trophy size={16} /> {busy ? "Recording…" : "Record matchup"}</button></div></form>;
}

type PodRow = { participantId: string; placement: number; points: number };
export function PodResultForm({ league, match }: { league: LeagueSummaryDTO; match?: LeagueMatchDTO }) {
  const router = useRouter(); const active = league.participants.filter((participant) => participant.status === "active");
  const initial = match ? match.entries.map((entry) => ({ participantId: entry.participantId, placement: entry.placement ?? 1, points: entry.score ?? 0 })) : active.slice(0, Math.min(4, active.length)).map((participant, index) => ({ participantId: participant.id, placement: index + 1, points: Math.max(0, 4 - index) }));
  const [rows, setRows] = useState<PodRow[]>(initial); const [busy, setBusy] = useState(false); const [error, setError] = useState<string | null>(null);
  function update(index: number, update: Partial<PodRow>) { setRows((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, ...update } : row)); }
  async function submit(event: React.FormEvent) { event.preventDefault(); setBusy(true); setError(null); try { await requestJson(match ? `/api/leagues/${league.id}/matches/${match.id}` : `/api/leagues/${league.id}/matches`, { method: match ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode: "pod", entries: rows }) }); router.refresh(); } catch (caught) { setError(messageFromRequestError(caught, "Unable to record pod.")); } finally { setBusy(false); } }
  return <form className="form-grid" onSubmit={submit}><p className="muted full" style={{ margin: 0 }}>Record every pod player with a unique placement. Points are added directly to the standings.</p>{rows.map((row, index) => <div className="inline-line full" key={`${index}-${row.participantId}`}><select aria-label={`Pod player ${index + 1}`} value={row.participantId} onChange={(event) => update(index, { participantId: event.target.value })}>{active.map((participant) => <option key={participant.id} value={participant.id}>{participant.memberName}</option>)}</select><input aria-label={`Placement ${index + 1}`} max={rows.length} min={1} type="number" value={row.placement} onChange={(event) => update(index, { placement: Number(event.target.value) })} /><input aria-label={`Points ${index + 1}`} max={100} min={-100} type="number" value={row.points} onChange={(event) => update(index, { points: Number(event.target.value) })} />{rows.length > 3 ? <button aria-label="Remove pod player" className="icon-button danger-icon" onClick={() => setRows((current) => current.filter((_, rowIndex) => rowIndex !== index))} type="button"><X size={14} /></button> : null}</div>)}{!match && rows.length < Math.min(20, active.length) ? <div className="full"><button className="button secondary" onClick={() => setRows((current) => [...current, { participantId: active.find((participant) => !current.some((row) => row.participantId === participant.id))?.id ?? active[0]?.id ?? "", placement: current.length + 1, points: 0 }])} type="button"><Plus size={14} /> Add pod player</button></div> : null}<div className="full"><ActionError message={error} /></div><div className="form-actions full"><button className="button" disabled={busy || rows.length < 3} type="submit">{busy ? "Saving…" : match ? "Correct pod result" : "Record pod"}</button></div></form>;
}

export function PointsAdjustmentForm({ league }: { league: LeagueSummaryDTO }) {
  const router = useRouter(); const active = league.participants.filter((participant) => participant.status === "active"); const [participantId, setParticipantId] = useState(active[0]?.id ?? ""); const [points, setPoints] = useState(1); const [reason, setReason] = useState(""); const [busy, setBusy] = useState(false); const [error, setError] = useState<string | null>(null);
  async function submit(event: React.FormEvent) { event.preventDefault(); setBusy(true); setError(null); try { await requestJson(`/api/leagues/${league.id}/points`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ participantId, points, reason }) }); setReason(""); router.refresh(); } catch (caught) { setError(messageFromRequestError(caught, "Unable to add points.")); } finally { setBusy(false); } }
  return <form className="form-grid" onSubmit={submit}><div className="field"><label>Player</label><select value={participantId} onChange={(event) => setParticipantId(event.target.value)}>{active.map((participant) => <option key={participant.id} value={participant.id}>{participant.memberName}</option>)}</select></div><div className="field"><label>Points</label><input max={100} min={-100} type="number" value={points} onChange={(event) => setPoints(Number(event.target.value))} /></div><div className="field full"><label>Reason</label><input maxLength={200} placeholder="Attendance, scenario objective, correction..." required value={reason} onChange={(event) => setReason(event.target.value)} /></div><div className="full"><ActionError message={error} /></div><div className="form-actions full"><button className="button" disabled={busy || !participantId || !reason.trim() || points === 0} type="submit"><Trophy size={16} /> {busy ? "Saving…" : "Add points"}</button></div></form>;
}

export function VoidResultButton({ leagueId, matchId }: { leagueId: string; matchId: string }) { const router = useRouter(); return <BusyButton action={async () => { await requestJson(`/api/leagues/${leagueId}/matches/${matchId}`, { method: "DELETE" }); router.refresh(); }} className="button secondary" confirm="Void this result? It will stop counting toward standings."><Trash2 size={14} /> Void</BusyButton>; }
export function DeleteAdjustmentButton({ leagueId, adjustmentId }: { leagueId: string; adjustmentId: string }) { const router = useRouter(); return <BusyButton action={async () => { await requestJson(`/api/leagues/${leagueId}/points/${adjustmentId}`, { method: "DELETE" }); router.refresh(); }} className="icon-button danger-icon" confirm="Remove this point adjustment?"><Trash2 size={14} /></BusyButton>; }
