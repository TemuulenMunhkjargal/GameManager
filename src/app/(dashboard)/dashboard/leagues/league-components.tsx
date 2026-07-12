"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Plus, X, Play, Trophy } from "lucide-react";
import type { LeagueSummaryDTO } from "@/application/leagues/ports";
import type { MemberSummaryDTO } from "@/application/members/ports";

export function CreateLeagueForm() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const [gameSystemLabel, setGameSystemLabel] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setError(null); setIsSubmitting(true);
    const res = await fetch("/api/leagues", { method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, gameSystemLabel: gameSystemLabel || "Other", description }) });
    setIsSubmitting(false);
    if (!res.ok) { const b = await res.json().catch(() => ({})) as { error?: string }; setError(b.error ?? "Failed."); return; }
    setName(""); setGameSystemLabel(""); setDescription(""); setIsOpen(false);
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
        <div className="field"><label>Name</label><input required value={name} onChange={(e) => setName(e.target.value)} /></div>
        <div className="field"><label>Game system</label><input value={gameSystemLabel} onChange={(e) => setGameSystemLabel(e.target.value)} placeholder="Magic, Pokémon…" /></div>
        <div className="field full"><label>Description</label><textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} style={{ resize: "vertical" }} /></div>
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

export function RecordResultForm({ league, members }: { league: LeagueSummaryDTO; members: MemberSummaryDTO[] }) {
  const router = useRouter();
  const [memberId, setMemberId] = useState(members[0]?.id ?? "");
  const [result, setResult] = useState<"win" | "loss" | "draw">("win");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setError(null); setIsSubmitting(true);
    const res = await fetch(`/api/leagues/${league.id}/result`, { method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memberProfileId: memberId, result }) });
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
        <button className="button" disabled={isSubmitting} type="submit">
          <Trophy size={16} /> {isSubmitting ? "Recording…" : "Record result"}
        </button>
      </div>
    </form>
  );
}
