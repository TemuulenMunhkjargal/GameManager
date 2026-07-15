"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Plus, X, Play, Trophy, Trash2 } from "lucide-react";
import type { LeagueSummaryDTO } from "@/application/leagues/ports";
import type { MemberSummaryDTO } from "@/application/members/ports";
import type { LeagueFormat } from "@/domain/leagues/league";
import { getLeagueFormat, LEAGUE_FORMATS } from "@/lib/league-formats";

export function CreateLeagueForm() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const [gameSystemLabel, setGameSystemLabel] = useState("");
  const [format, setFormat] = useState<LeagueFormat>("match_play");
  const [description, setDescription] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setError(null); setIsSubmitting(true);
    const res = await fetch("/api/leagues", { method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, gameSystemLabel: gameSystemLabel || "Other", format, description, startsAt: startsAt ? `${startsAt}T12:00:00` : null, endsAt: endsAt ? `${endsAt}T12:00:00` : null }) });
    setIsSubmitting(false);
    if (!res.ok) { const b = await res.json().catch(() => ({})) as { error?: string }; setError(b.error ?? "Failed."); return; }
    setName(""); setGameSystemLabel(""); setDescription(""); setIsOpen(false);
    setStartsAt(""); setEndsAt("");
    router.refresh();
  }

  if (!isOpen) {
    return <button className="button" onClick={() => setIsOpen(true)} type="button"><Plus size={18} /> New league</button>;
  }

  return (
    <div className="panel form-panel" style={{ marginBottom: 24 }}>
      <div className="topbar" style={{ marginBottom: 12 }}>
        <h3 style={{ margin: 0 }}>Create league</h3>
        <button className="button secondary" onClick={() => setIsOpen(false)} type="button"><X size={16} /></button>
      </div>
      <form className="form-grid" onSubmit={handleSubmit}>
        <div className="field"><label htmlFor="league-name">Name</label><input id="league-name" required value={name} onChange={(e) => setName(e.target.value)} /></div>
        <div className="field"><label htmlFor="league-game">Game system</label><input id="league-game" value={gameSystemLabel} onChange={(e) => setGameSystemLabel(e.target.value)} placeholder="Magic, Pokémon…" /></div>
        <div className="field full">
          <label htmlFor="league-format">League format</label>
          <select id="league-format" value={format} onChange={(e) => setFormat(e.target.value as LeagueFormat)}>
            {LEAGUE_FORMATS.map((option) => <option key={option.value} value={option.value}>{option.label} — {option.summary}</option>)}
          </select>
          <div className="league-format-explainer">
            <strong>{getLeagueFormat(format).label}</strong>
            <span>{getLeagueFormat(format).explanation}</span>
            <small>Best for: {getLeagueFormat(format).bestFor}</small>
          </div>
        </div>
        <div className="field full"><label htmlFor="league-description">Description</label><textarea id="league-description" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} style={{ resize: "vertical" }} /></div>
        <div className="field"><label htmlFor="league-starts">Starts</label><input id="league-starts" type="date" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} /></div>
        <div className="field"><label htmlFor="league-ends">Ends</label><input id="league-ends" min={startsAt || undefined} type="date" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} /></div>
        {error ? <p className="notice error full">{error}</p> : null}
        <div className="form-actions full"><button className="button" disabled={isSubmitting} type="submit">{isSubmitting ? "Creating…" : "Create league"}</button></div>
      </form>
    </div>
  );
}

export function StartLeagueButton({ leagueId }: { leagueId: string }) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start() {
    setIsSubmitting(true); setError(null);
    const res = await fetch(`/api/leagues/${leagueId}/start`, { method: "POST" });
    setIsSubmitting(false);
    if (!res.ok) { const b = await res.json().catch(() => ({})) as { error?: string }; setError(b.error ?? "Failed."); return; }
    router.refresh();
  }

  return (
    <div className="inline-line">
      <button className="button" disabled={isSubmitting} onClick={start} type="button">
        <Play size={16} /> {isSubmitting ? "Starting…" : "Start league"}
      </button>
      {error ? <span className="error">{error}</span> : null}
    </div>
  );
}

export function CompleteLeagueButton({ leagueId }: { leagueId: string }) {
  const router = useRouter(); const [busy, setBusy] = useState(false);
  async function complete() { if (!window.confirm("Complete this league? No more results can be recorded.")) return; setBusy(true); await fetch(`/api/leagues/${leagueId}/complete`, { method: "POST" }); setBusy(false); router.refresh(); }
  return <button className="button secondary" disabled={busy} onClick={complete} type="button"><Trophy size={16} />{busy ? "Completing..." : "Complete"}</button>;
}

export function DeleteLeagueButton({ leagueId, name }: { leagueId: string; name: string }) {
  const router = useRouter(); const [busy, setBusy] = useState(false); const [error, setError] = useState<string | null>(null);
  async function remove() {
    if (!window.confirm(`Delete ${name}? Its standings and recorded results will also be deleted.`)) return;
    setBusy(true); setError(null); const response = await fetch(`/api/leagues/${leagueId}`, { method: "DELETE" }); setBusy(false);
    if (!response.ok) { const body = await response.json().catch(() => ({})) as { error?: string }; setError(body.error ?? "Unable to delete league."); return; }
    router.refresh();
  }
  return <div><button aria-label={`Delete ${name}`} className="icon-button danger-icon" disabled={busy} onClick={remove} title="Delete league" type="button"><Trash2 size={16} /></button>{error ? <span className="row-error">{error}</span> : null}</div>;
}

export function RecordResultForm({ league, members }: { league: LeagueSummaryDTO; members: MemberSummaryDTO[] }) {
  const router = useRouter();
  const [memberId, setMemberId] = useState(members[0]?.id ?? "");
  const [opponentId, setOpponentId] = useState(members.find((member) => member.id !== members[0]?.id)?.id ?? "");
  const [result, setResult] = useState<"win" | "loss" | "draw">("win");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setError(null); setIsSubmitting(true);
    const res = await fetch(`/api/leagues/${league.id}/result`, { method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memberProfileId: memberId, opponentProfileId: opponentId, result }) });
    setIsSubmitting(false);
    if (!res.ok) { const b = await res.json().catch(() => ({})) as { error?: string }; setError(b.error ?? "Failed."); return; }
    router.refresh();
  }

  return (
    <form className="form-grid" onSubmit={handleSubmit}>
      <div className="field">
        <label>Member</label>
        <select value={memberId} onChange={(e) => setMemberId(e.target.value)}>
          {members.map((m) => <option key={m.id} value={m.id}>{m.displayName}</option>)}
        </select>
      </div>
      <div className="field"><label>Opponent</label><select value={opponentId} onChange={(e) => setOpponentId(e.target.value)}>{members.filter((member) => member.id !== memberId).map((member) => <option key={member.id} value={member.id}>{member.displayName}</option>)}</select></div>
      <div className="field">
        <label>Result</label>
        <select value={result} onChange={(e) => setResult(e.target.value as typeof result)}>
          <option value="win">Win</option>
          <option value="loss">Loss</option>
          <option value="draw">Draw</option>
        </select>
      </div>
      {error ? <p className="notice error full">{error}</p> : null}
      <div className="form-actions full">
        <button className="button" disabled={isSubmitting || !memberId || !opponentId || memberId === opponentId} type="submit">
          <Trophy size={16} /> {isSubmitting ? "Recording…" : "Record result"}
        </button>
      </div>
    </form>
  );
}

export function AwardPointsForm({ league, members }: { league: LeagueSummaryDTO; members: MemberSummaryDTO[] }) {
  const router = useRouter();
  const [memberId, setMemberId] = useState(members[0]?.id ?? "");
  const [points, setPoints] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const format = getLeagueFormat(league.format);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setError(null); setIsSubmitting(true);
    const res = await fetch(`/api/leagues/${league.id}/points`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memberProfileId: memberId, points }),
    });
    setIsSubmitting(false);
    if (!res.ok) { const body = await res.json().catch(() => ({})) as { error?: string }; setError(body.error ?? "Failed."); return; }
    router.refresh();
  }

  return (
    <form className="form-grid" onSubmit={handleSubmit}>
      <p className="muted full" style={{ margin: 0 }}>{format.label} uses direct point awards for placements, objectives, or participation.</p>
      <div className="field"><label>Player</label><select value={memberId} onChange={(e) => setMemberId(e.target.value)}>{members.map((member) => <option key={member.id} value={member.id}>{member.displayName}</option>)}</select></div>
      <div className="field"><label>Points to add</label><input max={100} min={-100} required type="number" value={points} onChange={(e) => setPoints(Number(e.target.value))} /><small>Use a negative number to correct or deduct points.</small></div>
      {error ? <p className="notice error full">{error}</p> : null}
      <div className="form-actions full"><button className="button" disabled={isSubmitting || !memberId || points === 0} type="submit"><Trophy size={16} /> {isSubmitting ? "Recording…" : "Award points"}</button></div>
    </form>
  );
}
