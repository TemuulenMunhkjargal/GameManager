"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { VenueSummaryDTO } from "@/application/venues/ports";
import type { EventDetailDTO } from "@/application/events/ports";

const CUSTOM_VENUE = "__custom__";

function toLocalInputValue(iso: string): string {
  const date = new Date(iso);
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60 * 1000);
  return local.toISOString().slice(0, 16);
}

type EditEventFormProps = {
  event: EventDetailDTO;
};

export function EditEventForm({ event }: EditEventFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [venues, setVenues] = useState<VenueSummaryDTO[]>([]);
  const [selectedVenueId, setSelectedVenueId] = useState<string>(event.venueId ?? CUSTOM_VENUE);
  const [venueNameFallback, setVenueNameFallback] = useState(event.venueName);
  const [selectedRoomId, setSelectedRoomId] = useState<string>(event.roomId ?? "");

  useEffect(() => {
    fetch("/api/venues")
      .then((r) => r.json())
      .then((d: { venues: VenueSummaryDTO[] }) => setVenues(d.venues))
      .catch(() => {});
  }, []);

  const selectedVenue = venues.find((v) => v.id === selectedVenueId);

  async function onSubmit(formData: FormData) {
    setIsSubmitting(true);
    setError(null);

    const entryFeeDollars = Number(formData.get("entryFeeDollars") || 0);
    const usingCustomVenue = selectedVenueId === CUSTOM_VENUE;

    const payload = {
      title: String(formData.get("title") || ""),
      description: String(formData.get("description") || ""),
      gameSystem: String(formData.get("gameSystem") || ""),
      venueId: usingCustomVenue ? null : selectedVenueId,
      venueName: usingCustomVenue ? venueNameFallback : (selectedVenue?.name ?? event.venueName),
      roomId: usingCustomVenue ? null : selectedRoomId || null,
      roomName: usingCustomVenue
        ? String(formData.get("roomNameFallback") || "")
        : (selectedVenue?.rooms.find((r) => r.id === selectedRoomId)?.name ?? null),
      startsAt: new Date(String(formData.get("startsAt"))).toISOString(),
      endsAt: new Date(String(formData.get("endsAt"))).toISOString(),
      capacity: Number(formData.get("capacity") || 0),
      entryFeeInCents: Math.round(entryFeeDollars * 100),
      waitlistEnabled: formData.get("waitlistEnabled") === "on",
    };

    const response = await fetch(`/api/events/${event.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const result = (await response.json()) as { event?: { id: string }; error?: string };

    setIsSubmitting(false);

    if (!response.ok || !result.event) {
      setError(result.error ?? "Unable to update event.");
      return;
    }

    router.push(`/dashboard/events/${event.id}`);
    router.refresh();
  }

  return (
    <form action={onSubmit}>
      <div className="form-grid">
        <div className="field full">
          <label htmlFor="title">Event title</label>
          <input id="title" name="title" required defaultValue={event.title} />
        </div>
        <div className="field full">
          <label htmlFor="description">Description</label>
          <textarea id="description" name="description" defaultValue={event.description} />
        </div>
        <div className="field">
          <label htmlFor="gameSystem">Game system</label>
          <select id="gameSystem" name="gameSystem" defaultValue={event.gameSystemLabel}>
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
          <input
            id="capacity"
            min={event.confirmedCount}
            name="capacity"
            required
            type="number"
            defaultValue={event.capacity}
          />
          {event.confirmedCount > 0 ? (
            <p className="muted" style={{ marginTop: 4 }}>
              Can't go below {event.confirmedCount} (current confirmed registrations).
            </p>
          ) : null}
        </div>
        <div className="field">
          <label htmlFor="venueId">Venue</label>
          <select
            id="venueId"
            value={selectedVenueId}
            onChange={(e) => {
              setSelectedVenueId(e.target.value);
              setSelectedRoomId("");
            }}
          >
            {venues.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
            <option value={CUSTOM_VENUE}>Other (type manually)…</option>
          </select>
          {selectedVenueId === CUSTOM_VENUE ? (
            <input
              onChange={(e) => setVenueNameFallback(e.target.value)}
              placeholder="Venue name"
              required
              style={{ marginTop: 8 }}
              value={venueNameFallback}
            />
          ) : null}
        </div>
        <div className="field">
          <label htmlFor="roomId">Room</label>
          {selectedVenueId === CUSTOM_VENUE ? (
            <input id="roomId" name="roomNameFallback" defaultValue={event.roomName ?? ""} placeholder="Main Play Room (optional)" />
          ) : (
            <select
              id="roomId"
              onChange={(e) => setSelectedRoomId(e.target.value)}
              value={selectedRoomId}
            >
              <option value="">No specific room</option>
              {(selectedVenue?.rooms ?? []).map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                  {r.capacity ? ` (${r.capacity} seats)` : ""}
                </option>
              ))}
            </select>
          )}
        </div>
        <div className="field">
          <label htmlFor="startsAt">Starts</label>
          <input
            id="startsAt"
            name="startsAt"
            required
            type="datetime-local"
            defaultValue={toLocalInputValue(event.startsAt)}
          />
        </div>
        <div className="field">
          <label htmlFor="endsAt">Ends</label>
          <input
            id="endsAt"
            name="endsAt"
            required
            type="datetime-local"
            defaultValue={toLocalInputValue(event.endsAt)}
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
            defaultValue={(event.entryFeeInCents / 100).toFixed(2)}
          />
        </div>
        <div className="field">
          <label className="inline-line">
            <input defaultChecked={event.waitlistEnabled} name="waitlistEnabled" type="checkbox" />
            Waitlist enabled
          </label>
        </div>
      </div>
      {error ? <p className="error">{error}</p> : null}
      <div className="form-actions">
        <button className="button" disabled={isSubmitting} type="submit">
          {isSubmitting ? "Saving…" : "Save changes"}
        </button>
      </div>
    </form>
  );
}
