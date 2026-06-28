"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

function toLocalInputValue(date: Date): string {
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60 * 1000);
  return local.toISOString().slice(0, 16);
}

const defaultStart = new Date();
defaultStart.setDate(defaultStart.getDate() + 7);
defaultStart.setHours(19, 0, 0, 0);

const defaultEnd = new Date(defaultStart);
defaultEnd.setHours(22, 0, 0, 0);

export function CreateEventForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function onSubmit(formData: FormData) {
    setIsSubmitting(true);
    setError(null);

    const entryFeeDollars = Number(formData.get("entryFeeDollars") || 0);
    const payload = {
      title: String(formData.get("title") || ""),
      description: String(formData.get("description") || ""),
      gameSystem: String(formData.get("gameSystem") || ""),
      venueName: String(formData.get("venueName") || ""),
      roomName: String(formData.get("roomName") || ""),
      startsAt: new Date(String(formData.get("startsAt"))).toISOString(),
      endsAt: new Date(String(formData.get("endsAt"))).toISOString(),
      capacity: Number(formData.get("capacity") || 0),
      entryFeeInCents: Math.round(entryFeeDollars * 100),
      waitlistEnabled: formData.get("waitlistEnabled") === "on",
    };

    const response = await fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const result = (await response.json()) as { event?: { id: string }; error?: string };

    setIsSubmitting(false);

    if (!response.ok || !result.event) {
      setError(result.error ?? "Unable to create event.");
      return;
    }

    router.push(`/dashboard/events/${result.event.id}`);
    router.refresh();
  }

  return (
    <form action={onSubmit}>
      <div className="form-grid">
        <div className="field full">
          <label htmlFor="title">Event title</label>
          <input id="title" name="title" placeholder="Friday Night Draft" required />
        </div>
        <div className="field full">
          <label htmlFor="description">Description</label>
          <textarea
            id="description"
            name="description"
            placeholder="Format, prize notes, table expectations, beginner friendliness..."
          />
        </div>
        <div className="field">
          <label htmlFor="gameSystem">Game system</label>
          <select id="gameSystem" name="gameSystem" defaultValue="Magic: The Gathering">
            <option>Magic: The Gathering</option>
            <option>Pokemon TCG</option>
            <option>Lorcana</option>
            <option>Dungeons & Dragons</option>
            <option>Warhammer</option>
            <option>Board Games</option>
            <option>Other</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="capacity">Capacity</label>
          <input id="capacity" min="1" name="capacity" required type="number" defaultValue="16" />
        </div>
        <div className="field">
          <label htmlFor="venueName">Venue</label>
          <input id="venueName" name="venueName" required defaultValue="Mana Vault Games" />
        </div>
        <div className="field">
          <label htmlFor="roomName">Room</label>
          <input id="roomName" name="roomName" placeholder="Main Play Room" />
        </div>
        <div className="field">
          <label htmlFor="startsAt">Starts</label>
          <input
            id="startsAt"
            name="startsAt"
            required
            type="datetime-local"
            defaultValue={toLocalInputValue(defaultStart)}
          />
        </div>
        <div className="field">
          <label htmlFor="endsAt">Ends</label>
          <input
            id="endsAt"
            name="endsAt"
            required
            type="datetime-local"
            defaultValue={toLocalInputValue(defaultEnd)}
          />
        </div>
        <div className="field">
          <label htmlFor="entryFeeDollars">Entry fee</label>
          <input
            id="entryFeeDollars"
            min="0"
            name="entryFeeDollars"
            step="0.01"
            type="number"
            defaultValue="5.00"
          />
        </div>
        <div className="field">
          <label htmlFor="waitlistEnabled">Waitlist</label>
          <select id="waitlistEnabledSelect" defaultValue="enabled" aria-label="Waitlist preference">
            <option value="enabled">Enabled</option>
          </select>
          <input hidden name="waitlistEnabled" readOnly value="on" />
        </div>
      </div>
      {error ? <p className="error">{error}</p> : null}
      <div className="form-actions">
        <button className="button" disabled={isSubmitting} type="submit">
          {isSubmitting ? "Creating..." : "Create event"}
        </button>
      </div>
    </form>
  );
}

