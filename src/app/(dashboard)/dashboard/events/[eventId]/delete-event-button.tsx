"use client";

import { Archive } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { messageFromRequestError, requestJson } from "@/lib/api-client";

export function DeleteEventButton({ eventId, name }: { eventId: string; name: string }) {
  const router = useRouter(); const [busy, setBusy] = useState(false); const [error, setError] = useState<string | null>(null);
  async function remove() {
    if (!window.confirm(`Archive ${name}? You can still view or permanently delete it from Archived Events.`)) return;
    setBusy(true);
    setError(null);
    try {
      await requestJson(`/api/events/${eventId}`, { method: "DELETE" });
      router.push("/dashboard/events/archive");
      router.refresh();
    } catch (cause) {
      setError(messageFromRequestError(cause, "Unable to archive event."));
    } finally {
      setBusy(false);
    }
  }
  return <div><button className="button danger" disabled={busy} onClick={remove} type="button"><Archive size={16} />{busy ? "Archiving..." : "Archive"}</button>{error ? <span className="error">{error}</span> : null}</div>;
}
