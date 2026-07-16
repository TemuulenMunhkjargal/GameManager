"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { EventSummaryDTO } from "@/application/events/ports";
import { messageFromRequestError, requestJson } from "@/lib/api-client";

export function ArchivedEventsTable({ events, page, pages, total }: { events: EventSummaryDTO[]; page: number; pages: number; total: number }) {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function remove(all = false) {
    if (!window.confirm(all ? `Permanently delete all ${total} archived events?` : `Permanently delete ${selected.length} selected event(s)?`)) return;
    setBusy(true);
    setError(null);
    try {
      await requestJson("/api/events/archive", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify(all ? { all: true } : { eventIds: selected }) });
      setSelected([]);
      router.refresh();
    } catch (cause) {
      setError(messageFromRequestError(cause, "Unable to delete archived events."));
    } finally {
      setBusy(false);
    }
  }
  const allOnPageSelected = events.length > 0 && events.every((event) => selected.includes(event.id));
  return <section className="panel table-wrap"><div className="archive-actions"><span>{total} of 100 archive slots used</span><div className="form-actions"><button className="button danger" disabled={busy || selected.length === 0} onClick={() => remove(false)} type="button">Delete selected</button><button className="button danger" disabled={busy || total === 0} onClick={() => remove(true)} type="button">Delete all</button></div></div>{error ? <p className="notice error">{error}</p> : null}<table><thead><tr><th><input aria-label="Select this page" checked={allOnPageSelected} onChange={(event) => setSelected(event.target.checked ? events.map((item) => item.id) : [])} type="checkbox" /></th><th>Event</th><th>Game</th><th>Archived</th><th>Status</th></tr></thead><tbody>{events.length ? events.map((event) => <tr key={event.id}><td><input aria-label={`Select ${event.title}`} checked={selected.includes(event.id)} onChange={(input) => setSelected((current) => input.target.checked ? [...current, event.id] : current.filter((id) => id !== event.id))} type="checkbox" /></td><td><Link href={`/dashboard/events/${event.id}`}><strong>{event.title}</strong></Link></td><td>{event.gameSystemLabel}</td><td>{new Date(event.archivedAt ?? event.endsAt).toLocaleString()}</td><td><span className="badge">{event.status}</span></td></tr>) : <tr><td colSpan={5}><div className="empty-state compact"><h3>No archived events</h3><p>Past events and events you archive appear here.</p></div></td></tr>}</tbody></table><div className="pagination"><Link aria-disabled={page === 1} className={`button secondary ${page === 1 ? "disabled" : ""}`} href={`?page=${Math.max(1, page - 1)}`}>Previous</Link><span>Page {page} of {pages}</span><Link aria-disabled={page === pages} className={`button secondary ${page === pages ? "disabled" : ""}`} href={`?page=${Math.min(pages, page + 1)}`}>Next</Link></div></section>;
}
