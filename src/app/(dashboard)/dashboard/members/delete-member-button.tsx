"use client";

import { Archive } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function DeleteMemberButton({ memberId, name }: { memberId: string; name: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function remove() {
    if (!window.confirm(`Archive ${name}? Their event and league history will be preserved.`)) return;
    setBusy(true); setError(null);
    const response = await fetch(`/api/members/${memberId}`, { method: "DELETE" });
    setBusy(false);
    if (!response.ok) { const body = await response.json().catch(() => ({})) as { error?: string }; setError(body.error ?? "Unable to archive player."); return; }
    router.refresh();
  }
  return <div><button aria-label={`Archive ${name}`} className="icon-button danger-icon" disabled={busy} onClick={remove} title="Archive player and preserve history" type="button"><Archive size={16} /></button>{error ? <span className="row-error">{error}</span> : null}</div>;
}
