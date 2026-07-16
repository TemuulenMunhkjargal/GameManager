"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { UserPlus } from "lucide-react";
import { messageFromRequestError, requestJson } from "@/lib/api-client";

export function AddAttendeeForm({ eventId, players }: { eventId: string; players: { id: string; displayName: string }[] }) {
  const router = useRouter();
  const [playerId, setPlayerId] = useState(players[0]?.id ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError(null);
    try {
      await requestJson(`/api/events/${eventId}/registrations`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ memberProfileId: playerId }) });
      router.refresh();
    } catch (requestError) {
      setError(messageFromRequestError(requestError, "Unable to add player."));
    } finally {
      setBusy(false);
    }
  }
  if (!players.length) return <p className="muted">All active players are already on this event. Add more from Players.</p>;
  return <form className="inline-line" onSubmit={submit}>
    <select aria-label="Player" value={playerId} onChange={(event) => setPlayerId(event.target.value)}>{players.map((player) => <option key={player.id} value={player.id}>{player.displayName}</option>)}</select>
    <button className="button secondary" disabled={busy || !playerId}><UserPlus size={16} />{busy ? "Adding..." : "Add player"}</button>
    {error ? <span className="error">{error}</span> : null}
  </form>;
}
