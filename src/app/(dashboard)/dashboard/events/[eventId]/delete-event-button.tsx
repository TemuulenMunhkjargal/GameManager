"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function DeleteEventButton({ eventId, name }: { eventId: string; name: string }) {
  const router = useRouter(); const [busy, setBusy] = useState(false); const [error, setError] = useState<string | null>(null);
  async function remove() { if (!window.confirm(`Delete ${name}? This cannot be undone.`)) return; setBusy(true); const response = await fetch(`/api/events/${eventId}`, { method: "DELETE" }); setBusy(false); if (!response.ok) { setError("Unable to delete event."); return; } router.push("/dashboard/events"); router.refresh(); }
  return <div><button className="button danger" disabled={busy} onClick={remove} type="button"><Trash2 size={16} />{busy ? "Deleting..." : "Delete"}</button>{error ? <span className="error">{error}</span> : null}</div>;
}
