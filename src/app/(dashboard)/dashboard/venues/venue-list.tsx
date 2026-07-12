"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ChevronDown, ChevronRight, Plus, X } from "lucide-react";
import type { VenueSummaryDTO } from "@/application/venues/ports";

export function VenueList({ venues, canManage }: { venues: VenueSummaryDTO[]; canManage: boolean }) {
  const router = useRouter();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [addingVenue, setAddingVenue] = useState(false);
  const [addingRoomFor, setAddingRoomFor] = useState<string | null>(null);

  const [venueName, setVenueName] = useState("");
  const [venueAddress, setVenueAddress] = useState("");
  const [roomName, setRoomName] = useState("");
  const [roomCapacity, setRoomCapacity] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submitVenue(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true); setError(null);
    const res = await fetch("/api/venues", { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: venueName, address: venueAddress || null }) });
    setIsSubmitting(false);
    if (!res.ok) { const b = await res.json().catch(() => ({})) as { error?: string }; setError(b.error ?? "Failed."); return; }
    setVenueName(""); setVenueAddress(""); setAddingVenue(false);
    router.refresh();
  }

  async function toggleArchive(venueId: string, isArchived: boolean) {
    setIsSubmitting(true); setError(null);
    const res = await fetch(`/api/venues/${venueId}/${isArchived ? "restore" : "archive"}`, { method: "POST" });
    setIsSubmitting(false);
    if (!res.ok) { const b = await res.json().catch(() => ({})) as { error?: string }; setError(b.error ?? "Failed."); return; }
    router.refresh();
  }

  async function submitRoom(e: React.FormEvent, venueId: string) {
    e.preventDefault();
    setIsSubmitting(true); setError(null);
    const res = await fetch(`/api/venues/${venueId}/rooms`, { method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: roomName, capacity: roomCapacity ? Number(roomCapacity) : null }) });
    setIsSubmitting(false);
    if (!res.ok) { const b = await res.json().catch(() => ({})) as { error?: string }; setError(b.error ?? "Failed."); return; }
    setRoomName(""); setRoomCapacity(""); setAddingRoomFor(null);
    router.refresh();
  }

  return (
    <div>
      {canManage && !addingVenue ? (
        <button className="button" onClick={() => setAddingVenue(true)} type="button" style={{ marginBottom: 16 }}>
          <Plus aria-hidden="true" size={18} /> Add venue
        </button>
      ) : null}

      {addingVenue ? (
        <div className="panel form-panel" style={{ marginBottom: 16 }}>
          <div className="topbar" style={{ marginBottom: 12 }}>
            <h3 style={{ margin: 0 }}>New venue</h3>
            <button className="button secondary" onClick={() => setAddingVenue(false)} type="button"><X size={16} /></button>
          </div>
          <form className="form-grid" onSubmit={submitVenue}>
            <div className="field"><label htmlFor="v-name">Name</label><input id="v-name" required value={venueName} onChange={(e) => setVenueName(e.target.value)} /></div>
            <div className="field"><label htmlFor="v-addr">Address</label><input id="v-addr" value={venueAddress} onChange={(e) => setVenueAddress(e.target.value)} /></div>
            {error ? <p className="notice error full">{error}</p> : null}
            <div className="form-actions full"><button className="button" disabled={isSubmitting} type="submit">{isSubmitting ? "Adding…" : "Add venue"}</button></div>
          </form>
        </div>
      ) : null}

      {venues.length === 0 ? <p className="notice">No venues yet. Add one to get started.</p> : null}

      {venues.map((venue) => (
        <div key={venue.id} className="panel detail-panel" style={{ marginBottom: 12, opacity: venue.status === "archived" ? 0.6 : 1 }}>
          <div className="attendee">
            <div>
              <strong>{venue.name}</strong>
              {venue.address ? <div className="muted">{venue.address}</div> : null}
            </div>
            <div className="form-actions">
              {venue.status === "archived" ? <span className="badge warning">archived</span> : null}
              <span className="muted">{venue.rooms.length} room{venue.rooms.length !== 1 ? "s" : ""}</span>
              <button className="button secondary" type="button"
                onClick={() => setExpanded(expanded === venue.id ? null : venue.id)}>
                {expanded === venue.id ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                Rooms
              </button>
              {canManage ? (
                <button
                  className={venue.status === "archived" ? "button secondary" : "button danger"}
                  disabled={isSubmitting}
                  onClick={() => toggleArchive(venue.id, venue.status === "archived")}
                  type="button"
                >
                  {venue.status === "archived" ? "Restore" : "Archive"}
                </button>
              ) : null}
            </div>
          </div>

          {expanded === venue.id ? (
            <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--line)" }}>
              {venue.rooms.length > 0 ? (
                <ul className="attendee-list" style={{ marginBottom: 12 }}>
                  {venue.rooms.map((r) => (
                    <li className="attendee" key={r.id}>
                      <span>{r.name}</span>
                      {r.capacity ? <span className="badge">{r.capacity} seats</span> : null}
                    </li>
                  ))}
                </ul>
              ) : <p className="muted" style={{ marginBottom: 8 }}>No rooms yet.</p>}

              {canManage && addingRoomFor !== venue.id ? (
                <button className="button secondary" type="button" onClick={() => { setAddingRoomFor(venue.id); setError(null); }}>
                  <Plus size={16} /> Add room
                </button>
              ) : null}

              {addingRoomFor === venue.id ? (
                <form className="form-grid" style={{ marginTop: 8 }} onSubmit={(e) => submitRoom(e, venue.id)}>
                  <div className="field"><label>Room name</label><input required value={roomName} onChange={(e) => setRoomName(e.target.value)} /></div>
                  <div className="field"><label>Capacity</label><input type="number" min={1} value={roomCapacity} onChange={(e) => setRoomCapacity(e.target.value)} /></div>
                  {error ? <p className="notice error full">{error}</p> : null}
                  <div className="form-actions full">
                    <button className="button secondary" type="button" onClick={() => setAddingRoomFor(null)}>Cancel</button>
                    <button className="button" disabled={isSubmitting} type="submit">{isSubmitting ? "Adding…" : "Add room"}</button>
                  </div>
                </form>
              ) : null}
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}
