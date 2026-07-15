"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRightLeft, Pencil, Plus, Trash2, UserMinus, Users, X } from "lucide-react";
import type { GameTableDTO } from "@/application/tables/ports";
import type { MemberSummaryDTO } from "@/application/members/ports";

function elapsed(from: string | null, now: number): string {
  if (!from) return "Ready";
  const minutes = Math.max(0, Math.floor((now - new Date(from).getTime()) / 60000));
  const hours = Math.floor(minutes / 60);
  return hours ? `${hours}h ${minutes % 60}m` : `${minutes}m`;
}

export function TableBoard({ tables, members }: { tables: GameTableDTO[]; members: MemberSummaryDTO[] }) {
  const router = useRouter();
  const activeTables = tables.filter((table) => table.status === "active");
  const seatedMemberIds = new Set(activeTables.flatMap((table) => table.occupants.map((seat) => seat.memberProfileId).filter(Boolean)));
  const availableMembers = members.filter((member) => member.status === "active" && !seatedMemberIds.has(member.id));
  const [now, setNow] = useState(0);
  const [addingTable, setAddingTable] = useState(tables.length === 0);
  const [seatingAt, setSeatingAt] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [capacity, setCapacity] = useState("4");
  const [quantity, setQuantity] = useState("1");
  const [memberId, setMemberId] = useState(availableMembers[0]?.id ?? "");
  const [editingTable, setEditingTable] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editCapacity, setEditCapacity] = useState("4");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { const update = () => setNow(Date.now()); const starter = window.setTimeout(update, 0); const timer = window.setInterval(update, 30000); return () => { window.clearTimeout(starter); window.clearInterval(timer); }; }, []);

  async function request(url: string, options: RequestInit = {}) {
    setBusy(true); setError(null);
    const response = await fetch(url, options);
    setBusy(false);
    if (!response.ok) {
      const body = await response.json().catch(() => ({})) as { error?: string };
      setError(body.error ?? "That action could not be completed.");
      return false;
    }
    router.refresh();
    return true;
  }

  async function addTable(event: React.FormEvent) {
    event.preventDefault();
    if (await request("/api/tables", { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, capacity: Number(capacity), quantity: Number(quantity) }) })) {
      setName(""); setCapacity("4"); setQuantity("1"); setAddingTable(false);
    }
  }

  async function addOccupant(event: React.FormEvent, tableId: string) {
    event.preventDefault();
    if (await request(`/api/tables/${tableId}/seat`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ memberProfileId: memberId }) })) {
      setSeatingAt(null);
    }
  }

  async function addGuest(tableId: string) {
    const used = activeTables.flatMap((table) => table.occupants).map((seat) => /^Guest (\d+)$/.exec(seat.name)?.[1]).filter(Boolean).map(Number);
    const guestName = `Guest ${used.length ? Math.max(...used) + 1 : 1}`;
    await request(`/api/tables/${tableId}/seat`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ guestName }) });
  }

  async function saveTable(event: React.FormEvent, tableId: string) {
    event.preventDefault();
    if (await request(`/api/tables/${tableId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: editName, capacity: Number(editCapacity) }) })) setEditingTable(null);
  }

  return (
    <div className="table-board-section">
      <div className="toolbar">
        <div><h2>Floor board</h2><p className="muted">Live occupancy updates automatically.</p></div>
        {!addingTable ? <button className="button" onClick={() => setAddingTable(true)} type="button"><Plus size={17} /> Add table</button> : null}
      </div>
      {addingTable ? (
        <form className="panel quick-form" onSubmit={addTable}>
          <div className="field"><label htmlFor="table-name">Name or prefix</label><input id="table-name" placeholder={Number(quantity) > 1 ? "Table" : "Table 1"} required value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div className="field"><label htmlFor="table-quantity">How many</label><input id="table-quantity" min={1} max={Math.max(1, 20 - activeTables.length)} required type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} /></div>
          <div className="field"><label htmlFor="table-capacity">Seats each</label><input id="table-capacity" min={1} max={20} required type="number" value={capacity} onChange={(e) => setCapacity(e.target.value)} /></div>
          <div className="form-actions"><button className="button" disabled={busy}>Add {Number(quantity) > 1 ? `${quantity} tables` : "table"}</button>{tables.length ? <button className="button secondary" onClick={() => setAddingTable(false)} type="button"><X size={16} /> Cancel</button> : null}</div>
        </form>
      ) : null}
      {error ? <p className="notice error" role="alert">{error}</p> : null}
      {activeTables.length === 0 && !addingTable ? <div className="panel empty-state"><Users size={26} /><h3>No tables on the floor</h3><p>Add the tables you normally use; they will be ready for every game night.</p></div> : null}
      <div className="floor-grid">
        {activeTables.map((table) => {
          const isOccupied = table.occupants.length > 0;
          const isFull = table.occupants.length >= table.capacity;
          return (
            <section className={`panel table-card ${isOccupied ? "occupied" : "available"}`} key={table.id}>
              <div className="table-card-header">
                <div><p className="table-state">{isOccupied ? "Occupied" : "Available"}</p><h3>{table.name}</h3></div>
                <div className="table-timer"><strong>{elapsed(table.occupiedSince, now)}</strong><span>{table.occupants.length}/{table.capacity} seats</span></div>
              </div>
              {editingTable === table.id ? <form className="seat-form" onSubmit={(event) => saveTable(event, table.id)}><div className="field"><label>Table name</label><input required value={editName} onChange={(e) => setEditName(e.target.value)} /></div><div className="field"><label>Seats</label><input min={Math.max(1, table.occupants.length)} max={20} required type="number" value={editCapacity} onChange={(e) => setEditCapacity(e.target.value)} /></div><div className="form-actions"><button className="button" disabled={busy}>Save</button><button className="button secondary" onClick={() => setEditingTable(null)} type="button">Cancel</button></div></form> : null}
              <div className="seat-list">
                {table.occupants.map((seat) => (
                  <div className="seat-row" key={seat.id}>
                    <div><strong>{seat.name}</strong><span>Seated {elapsed(seat.seatedAt, now)}</span></div>
                    <div className="seat-actions">
                      {activeTables.length > 1 ? (
                        <label className="move-control"><ArrowRightLeft size={14} /><span className="sr-only">Move {seat.name}</span><select disabled={busy} value="" onChange={(e) => e.target.value && request(`/api/tables/occupants/${seat.id}/move`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ targetTableId: e.target.value }) })}><option value="">Move</option>{activeTables.filter((candidate) => candidate.id !== table.id && candidate.occupants.length < candidate.capacity).map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.name}</option>)}</select></label>
                      ) : null}
                      <button aria-label={`Release ${seat.name}`} className="icon-button" disabled={busy} onClick={() => request(`/api/tables/occupants/${seat.id}`, { method: "DELETE" })} title="Release player" type="button"><UserMinus size={16} /></button>
                    </div>
                  </div>
                ))}
                {!isOccupied ? <p className="open-table-copy">Clean, open, and ready for a group.</p> : null}
              </div>
              {seatingAt === table.id ? (
                <form className="seat-form" onSubmit={(event) => addOccupant(event, table.id)}>
                  <select autoFocus required value={memberId} onChange={(e) => setMemberId(e.target.value)}><option value="" disabled>{availableMembers.length ? "Choose player" : "No unseated players"}</option>{availableMembers.map((member) => <option key={member.id} value={member.id}>{member.displayName}</option>)}</select>
                  <div className="form-actions"><button className="button" disabled={busy || !memberId}>Seat player</button><button className="button secondary" onClick={() => setSeatingAt(null)} type="button">Cancel</button></div>
                </form>
              ) : (
                <div className="table-card-actions">
                  <button className="button" disabled={busy || isFull || !availableMembers.length} onClick={() => { setSeatingAt(table.id); setMemberId(availableMembers[0]?.id ?? ""); }} type="button"><Plus size={16} /> Seat player</button>
                  <button className="button secondary" disabled={busy || isFull} onClick={() => addGuest(table.id)} type="button"><Plus size={16} /> Add guest</button>
                  <button aria-label={`Edit ${table.name}`} className="icon-button" disabled={busy} onClick={() => { setEditingTable(table.id); setEditName(table.name); setEditCapacity(String(table.capacity)); }} title="Edit table" type="button"><Pencil size={15} /></button>
                  {isOccupied ? <button className="button secondary" disabled={busy} onClick={() => request(`/api/tables/${table.id}/release`, { method: "POST" })} type="button">Release table</button> : <button aria-label={`Delete ${table.name}`} className="icon-button danger-icon" disabled={busy} onClick={() => window.confirm(`Permanently delete ${table.name}?`) && request(`/api/tables/${table.id}`, { method: "DELETE" })} title="Delete table" type="button"><Trash2 size={15} /></button>}
                </div>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
