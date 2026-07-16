"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { messageFromRequestError, requestJson } from "@/lib/api-client";

type Props = { initial: { name: string; contactEmail: string; timezone: string; waitlistsEnabledByDefault: boolean; discordWebhookUrl: string | null } };

export function SettingsForm({ initial }: Props) {
  const router = useRouter();
  const [name, setName] = useState(initial.name); const [contactEmail, setContactEmail] = useState(initial.contactEmail);
  const [timezone, setTimezone] = useState(initial.timezone); const [waitlists, setWaitlists] = useState(initial.waitlistsEnabledByDefault);
  const [webhook, setWebhook] = useState(initial.discordWebhookUrl ?? ""); const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null); const [busy, setBusy] = useState(false); const [testing, setTesting] = useState(false);
  const timezones = useMemo(() => { const values = typeof Intl.supportedValuesOf === "function" ? Intl.supportedValuesOf("timeZone") : ["UTC", "America/Chicago", "America/New_York", "America/Denver", "America/Los_Angeles"]; return values.includes(initial.timezone) ? values : [initial.timezone, ...values]; }, [initial.timezone]);

  async function save(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError(null); setMessage(null);
    try {
      await requestJson("/api/organization/settings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, contactEmail, timezone, waitlistsEnabledByDefault: waitlists, discordWebhookUrl: webhook.trim() || null }) });
      setMessage("Settings saved."); router.refresh();
    } catch (cause) {
      setError(messageFromRequestError(cause, "Unable to save settings."));
    } finally {
      setBusy(false);
    }
  }

  async function testDiscord() {
    setTesting(true); setError(null); setMessage(null);
    try {
      await requestJson("/api/organization/discord/test", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ webhookUrl: webhook.trim() }) });
      setMessage("Test message sent. Check the selected Discord channel.");
    } catch (cause) {
      setError(messageFromRequestError(cause, "Discord test failed."));
    } finally {
      setTesting(false);
    }
  }

  return <form onSubmit={save}><div className="topbar"><div><p className="eyebrow">Workspace</p><h1 className="page-title">Settings</h1><p className="page-copy">Local preferences and optional announcements.</p></div><button className="button" disabled={busy}>{busy ? "Saving..." : "Save changes"}</button></div>
    {error ? <p className="notice error" role="alert">{error}</p> : null}{message ? <p className="notice success">{message}</p> : null}
    <div className="detail-layout"><section className="panel form-panel"><h2>Workspace</h2><div className="form-grid">
      <div className="field"><label htmlFor="name">Workspace name</label><input id="name" required value={name} onChange={(e) => setName(e.target.value)} /></div>
      <div className="field"><label htmlFor="email">Contact email <span className="muted">(optional)</span></label><input id="email" type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} /></div>
      <div className="field full"><label htmlFor="timezone">Timezone</label><select id="timezone" value={timezone} onChange={(e) => setTimezone(e.target.value)}>{timezones.map((zone) => <option key={zone} value={zone}>{zone.replaceAll("_", " ")}</option>)}</select><span className="muted">Used when GameHall displays dates and sends Discord announcements.</span></div>
      <label className="inline-line full"><input checked={waitlists} onChange={(e) => setWaitlists(e.target.checked)} type="checkbox" /> Enable waitlists by default</label>
    </div></section><aside className="panel detail-panel"><h3>Discord announcements</h3><p className="muted">In Discord, open a channel&apos;s settings, choose Integrations → Webhooks → New Webhook, then copy its URL here. GameHall posts event and league updates to that channel.</p>
      <div className="field"><label htmlFor="discord-webhook">Channel webhook URL</label><input id="discord-webhook" placeholder="https://discord.com/api/webhooks/..." type="url" value={webhook} onChange={(e) => setWebhook(e.target.value)} /></div>
      <div className="form-actions"><button className="button secondary" disabled={testing || !webhook.trim()} onClick={testDiscord} type="button">{testing ? "Sending..." : "Send test message"}</button>{webhook ? <button className="button secondary" onClick={() => setWebhook("")} type="button">Disconnect</button> : null}</div>
    </aside></div></form>;
}
