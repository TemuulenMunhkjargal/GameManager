"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { commonGames, resolveGameChoice } from "@/lib/game-catalog";

function toLocalInputValue(date: Date): string {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60 * 1000);
  return local.toISOString().slice(0, 16);
}
const defaultStart = new Date();
defaultStart.setDate(defaultStart.getDate() + 7); defaultStart.setHours(19, 0, 0, 0);
const defaultEnd = new Date(defaultStart); defaultEnd.setHours(22, 0, 0, 0);

export function CreateEventForm({ systems }: { systems: { id: string; name: string; defaultCapacity: number }[] }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [gameChoice, setGameChoice] = useState(systems[0]?.id ?? commonGames[0].value);
  const [customGame, setCustomGame] = useState("");
  async function onSubmit(formData: FormData) {
    setIsSubmitting(true); setError(null);
    const entryFeeDollars = Number(formData.get("entryFeeDollars") || 0);
    const game = resolveGameChoice(gameChoice, customGame, systems);
    const payload = { title: String(formData.get("title") || ""), description: String(formData.get("description") || ""),
      gameSystem: game.label, gameSystemId: game.gameSystemId,
      startsAt: new Date(String(formData.get("startsAt"))).toISOString(),
      endsAt: new Date(String(formData.get("endsAt"))).toISOString(), capacity: Number(formData.get("capacity") || 0),
      entryFeeInCents: Math.round(entryFeeDollars * 100), waitlistEnabled: formData.get("waitlistEnabled") === "on",
      publishImmediately: formData.get("publishImmediately") !== "draft" };
    const response = await fetch("/api/events", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const result = await response.json() as { event?: { id: string }; error?: string };
    setIsSubmitting(false);
    if (!response.ok || !result.event) { setError(result.error ?? "Unable to create event."); return; }
    router.push(`/dashboard/events/${result.event.id}`); router.refresh();
  }
  return <form action={onSubmit}><div className="form-grid">
    <div className="field full"><label htmlFor="title">Event title</label><input id="title" name="title" placeholder="Friday Night Draft" required /></div>
    <div className="field full"><label htmlFor="description">Description</label><textarea id="description" name="description" placeholder="Format, game notes, table expectations, beginner friendliness..." /></div>
    <div className="field"><label htmlFor="gameSystem">Game system</label><select id="gameSystem" value={gameChoice} onChange={(e) => setGameChoice(e.target.value)}>{systems.length ? <optgroup label="Your games">{systems.map((system) => <option key={system.id} value={system.id}>{system.name}</option>)}</optgroup> : null}<optgroup label="Popular games">{commonGames.map((game) => <option key={game.value} value={game.value}>{game.label}</option>)}</optgroup><option value="__other__">Other</option></select>{gameChoice === "__other__" ? <input autoFocus aria-label="Other game" placeholder="Enter the game or system" required value={customGame} onChange={(e) => setCustomGame(e.target.value)} /> : null}</div>
    <div className="field"><label htmlFor="capacity">Capacity</label><input key={gameChoice} id="capacity" min="1" name="capacity" required type="number" defaultValue={resolveGameChoice(gameChoice, customGame, systems).defaultCapacity} /></div>
    <div className="field"><label htmlFor="startsAt">Starts</label><input id="startsAt" name="startsAt" required type="datetime-local" defaultValue={toLocalInputValue(defaultStart)} /></div>
    <div className="field"><label htmlFor="endsAt">Ends</label><input id="endsAt" name="endsAt" required type="datetime-local" defaultValue={toLocalInputValue(defaultEnd)} /></div>
    <div className="field"><label htmlFor="entryFeeDollars">Shared cost</label><input id="entryFeeDollars" min="0" name="entryFeeDollars" step="0.01" type="number" defaultValue="0.00" /></div>
    <div className="field"><label className="inline-line"><input defaultChecked name="waitlistEnabled" type="checkbox" /> Waitlist enabled</label></div>
  </div>{error ? <p className="error">{error}</p> : null}<div className="form-actions"><button className="button secondary" disabled={isSubmitting} name="publishImmediately" type="submit" value="draft">{isSubmitting ? "Saving..." : "Save as draft"}</button><button className="button" disabled={isSubmitting} type="submit">{isSubmitting ? "Creating..." : "Publish now"}</button></div></form>;
}
