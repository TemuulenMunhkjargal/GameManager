"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { EventDetailDTO } from "@/application/events/ports";
import { messageFromRequestError, requestJson } from "@/lib/api-client";

function toLocalInputValue(iso: string): string { const date = new Date(iso); return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16); }

export function EditEventForm({ event }: { event: EventDetailDTO }) {
  const router = useRouter(); const [error, setError] = useState<string | null>(null); const [isSubmitting, setIsSubmitting] = useState(false);
  async function onSubmit(formData: FormData) {
    setIsSubmitting(true); setError(null);
    try {
      const payload = { title: String(formData.get("title") || ""), description: String(formData.get("description") || ""),
        gameSystem: String(formData.get("gameSystem") || ""),
        gameSystemId: event.gameSystemId,
        startsAt: new Date(String(formData.get("startsAt"))).toISOString(), endsAt: new Date(String(formData.get("endsAt"))).toISOString(),
        capacity: Number(formData.get("capacity") || 0), entryFeeInCents: Math.round(Number(formData.get("entryFeeDollars") || 0) * 100),
        waitlistEnabled: formData.get("waitlistEnabled") === "on" };
      const result = await requestJson<{ event?: { id: string } }>(`/api/events/${event.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!result.event) throw new Error("GameHall did not return the updated event.");
      router.push(`/dashboard/events/${event.id}`); router.refresh();
    } catch (requestError) {
      setError(messageFromRequestError(requestError, "Unable to update event."));
    } finally {
      setIsSubmitting(false);
    }
  }
  return <form action={onSubmit}><div className="form-grid">
    <div className="field full"><label htmlFor="title">Event title</label><input id="title" name="title" required defaultValue={event.title} /></div>
    <div className="field full"><label htmlFor="description">Description</label><textarea id="description" name="description" defaultValue={event.description} /></div>
    <div className="field"><label htmlFor="gameSystem">Game system</label><input id="gameSystem" name="gameSystem" required defaultValue={event.gameSystemLabel} /></div>
    <div className="field"><label htmlFor="capacity">Capacity</label><input id="capacity" min={event.confirmedCount || 1} name="capacity" required type="number" defaultValue={event.capacity} />{event.confirmedCount ? <p className="muted">Minimum {event.confirmedCount} with current registrations.</p> : null}</div>
    <div className="field"><label htmlFor="startsAt">Starts</label><input id="startsAt" name="startsAt" required type="datetime-local" defaultValue={toLocalInputValue(event.startsAt)} /></div>
    <div className="field"><label htmlFor="endsAt">Ends</label><input id="endsAt" name="endsAt" required type="datetime-local" defaultValue={toLocalInputValue(event.endsAt)} /></div>
    <div className="field"><label htmlFor="entryFeeDollars">Shared cost</label><input id="entryFeeDollars" min="0" name="entryFeeDollars" step="0.01" type="number" defaultValue={(event.entryFeeInCents / 100).toFixed(2)} /></div>
    <div className="field"><label className="inline-line"><input defaultChecked={event.waitlistEnabled} name="waitlistEnabled" type="checkbox" /> Waitlist enabled</label></div>
  </div>{error ? <p className="error">{error}</p> : null}<div className="form-actions"><button className="button" disabled={isSubmitting} type="submit">{isSubmitting ? "Saving..." : "Save changes"}</button></div></form>;
}
