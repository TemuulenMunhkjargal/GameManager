"use client";

import { DatabaseBackup, Download, RotateCcw, Trash2, Upload } from "lucide-react";
import { useEffect, useState } from "react";

type Backup = { fileName: string; createdAt: string; size: number; kind: "auto" | "manual" | "pre-restore" | "pre-migration" };
const PAGE_SIZE = 10;
const labels: Record<Backup["kind"], string> = { auto: "Automatic", manual: "Manual", "pre-restore": "Before restore", "pre-migration": "Before upgrade" };

export function BackupPanel() {
  const [backups, setBackups] = useState<Backup[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  async function refresh() { const response = await fetch("/api/backups", { cache: "no-store" }); if (response.ok) { const next = ((await response.json()) as { backups: Backup[] }).backups; setBackups(next); setPage((current) => Math.min(current, Math.max(1, Math.ceil(next.length / PAGE_SIZE)))); } }
  useEffect(() => { void fetch("/api/backups", { cache: "no-store" }).then((response) => response.json()).then((body: { backups: Backup[] }) => setBackups(body.backups)); }, []);
  async function restore(url: string, options?: RequestInit) {
    if (!window.confirm("Restore this backup? GameHall will first preserve the current database.")) return;
    setBusy(true); setError(null); setMessage(null); const response = await fetch(url, { method: "POST", ...options }); setBusy(false);
    const body = await response.json().catch(() => ({})) as { error?: string };
    if (!response.ok) { setError(body.error ?? "Restore failed."); return; }
    setMessage("Backup restored successfully. Reloading GameHall..."); window.setTimeout(() => window.location.reload(), 700);
  }
  async function upload(file?: File) { if (!file) return; const form = new FormData(); form.set("backup", file); await restore("/api/backups/restore", { body: form }); }
  async function remove(all = false) {
    if (!window.confirm(all ? `Permanently delete all ${backups.length} backups?` : `Permanently delete ${selected.length} selected backup(s)?`)) return;
    setBusy(true); setError(null); const response = await fetch("/api/backups", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify(all ? { all: true } : { fileNames: selected }) }); setBusy(false);
    if (!response.ok) { setError("Unable to delete backups."); return; } setSelected([]); await refresh();
  }
  const pages = Math.max(1, Math.ceil(backups.length / PAGE_SIZE));
  const shown = backups.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const allOnPageSelected = shown.length > 0 && shown.every((backup) => selected.includes(backup.fileName));
  return <section className="panel detail-panel backup-panel"><div className="topbar"><div><p className="muted">One daily snapshot is retained for seven days. Restore safety copies are limited to five. Showing 10 per page.</p></div><a className="button" download href="/api/backups/download"><Download size={16} /> Download current backup</a></div>
    {error ? <p className="notice error">{error}</p> : null}{message ? <p className="notice success">{message}</p> : null}
    <div className="archive-actions"><label className="button secondary upload-button"><Upload size={16} /> Restore from file<input accept=".db,application/vnd.sqlite3" disabled={busy} hidden type="file" onChange={(event) => { void upload(event.target.files?.[0]); event.target.value = ""; }} /></label><div className="form-actions"><button className="button danger" disabled={busy || selected.length === 0} onClick={() => remove(false)} type="button"><Trash2 size={15} />Delete selected</button><button className="button danger" disabled={busy || backups.length === 0} onClick={() => remove(true)} type="button">Delete all</button></div></div>
    {shown.length ? <><div className="backup-row backup-select-row"><input aria-label="Select this page" checked={allOnPageSelected} onChange={(event) => setSelected(event.target.checked ? shown.map((backup) => backup.fileName) : [])} type="checkbox" /><strong>Select this page</strong></div><div className="backup-list">{shown.map((backup) => <div className="backup-row" key={backup.fileName}><input aria-label={`Select ${labels[backup.kind]} backup`} checked={selected.includes(backup.fileName)} onChange={(event) => setSelected((current) => event.target.checked ? [...current, backup.fileName] : current.filter((name) => name !== backup.fileName))} type="checkbox" /><DatabaseBackup size={18} /><div><strong>{labels[backup.kind]}</strong><span>{new Date(backup.createdAt).toLocaleString()} · {(backup.size / 1024).toFixed(0)} KB</span></div><a className="icon-button" href={`/api/backups/${encodeURIComponent(backup.fileName)}`} title="Download"><Download size={15} /></a><button className="icon-button" disabled={busy} onClick={() => restore(`/api/backups/${encodeURIComponent(backup.fileName)}/restore`)} title="Restore"><RotateCcw size={15} /></button></div>)}</div></> : <p className="muted">The first automatic backup is created when GameHall starts.</p>}
    <div className="pagination"><button className="button secondary" disabled={page === 1} onClick={() => setPage((current) => current - 1)} type="button">Previous</button><span>Page {page} of {pages}</span><button className="button secondary" disabled={page === pages} onClick={() => setPage((current) => current + 1)} type="button">Next</button></div>
  </section>;
}
