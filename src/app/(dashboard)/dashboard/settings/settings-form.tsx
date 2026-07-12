"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type SettingsFormProps = {
  publicSlug: string;
  initial: {
    name: string;
    contactEmail: string;
    timezone: string;
    defaultVenueName: string;
    publicPageEnabled: boolean;
    waitlistsEnabledByDefault: boolean;
    discordWebhookUrl: string | null;
  };
};

export function SettingsForm({ publicSlug, initial }: SettingsFormProps) {
  const router = useRouter();
  const [name, setName] = useState(initial.name);
  const [contactEmail, setContactEmail] = useState(initial.contactEmail);
  const [timezone, setTimezone] = useState(initial.timezone);
  const [defaultVenueName, setDefaultVenueName] = useState(initial.defaultVenueName);
  const [publicPageEnabled, setPublicPageEnabled] = useState(initial.publicPageEnabled);
  const [waitlistsEnabledByDefault, setWaitlistsEnabledByDefault] = useState(
    initial.waitlistsEnabledByDefault,
  );
  const [discordWebhookUrl, setDiscordWebhookUrl] = useState(initial.discordWebhookUrl ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(formEvent: React.FormEvent<HTMLFormElement>) {
    formEvent.preventDefault();
    setError(null);
    setSaved(false);
    setIsSubmitting(true);

    const response = await fetch("/api/organization/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        contactEmail,
        timezone,
        defaultVenueName,
        publicPageEnabled,
        waitlistsEnabledByDefault,
        discordWebhookUrl: discordWebhookUrl.trim() || null,
      }),
    });

    setIsSubmitting(false);

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(body?.error ?? "Unable to save settings.");
      return;
    }

    setSaved(true);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="topbar">
        <div>
          <p className="eyebrow">Workspace</p>
          <h1 className="page-title">Settings</h1>
          <p className="page-copy">
            Store profile, public signup defaults, and operational preferences.
          </p>
        </div>
        <button className="button" disabled={isSubmitting} type="submit">
          {isSubmitting ? "Saving..." : "Save changes"}
        </button>
      </div>

      {error ? <p className="notice error">{error}</p> : null}
      {saved && !error ? <p className="notice">Settings saved.</p> : null}

      <div className="detail-layout">
        <section className="panel form-panel">
          <h2>Organization profile</h2>
          <div className="form-grid">
            <div className="field">
              <label htmlFor="name">Store name</label>
              <input id="name" onChange={(e) => setName(e.target.value)} required value={name} />
            </div>
            <div className="field">
              <label htmlFor="email">Contact email</label>
              <input
                id="email"
                onChange={(e) => setContactEmail(e.target.value)}
                required
                type="email"
                value={contactEmail}
              />
            </div>
            <div className="field">
              <label htmlFor="timezone">Timezone</label>
              <input
                id="timezone"
                onChange={(e) => setTimezone(e.target.value)}
                required
                value={timezone}
              />
            </div>
            <div className="field">
              <label htmlFor="venue">Default venue</label>
              <input
                id="venue"
                onChange={(e) => setDefaultVenueName(e.target.value)}
                required
                value={defaultVenueName}
              />
            </div>
          </div>
        </section>

        <aside className="panel detail-panel">
          <h3>Public signup defaults</h3>
          <div className="settings-list">
            <label className="inline-line">
              <input
                checked={publicPageEnabled}
                onChange={(e) => setPublicPageEnabled(e.target.checked)}
                type="checkbox"
              />
              Public event pages enabled
            </label>
            <label className="inline-line">
              <input
                checked={waitlistsEnabledByDefault}
                onChange={(e) => setWaitlistsEnabledByDefault(e.target.checked)}
                type="checkbox"
              />
              Waitlists enabled by default
            </label>
          </div>
          <hr style={{ margin: "16px 0", border: "none", borderTop: "1px solid var(--line)" }} />
          <p className="muted">Public URL slug (read-only, set at creation)</p>
          <p>
            <code>/stores/{publicSlug}</code>
          </p>
          <hr style={{ margin: "16px 0", border: "none", borderTop: "1px solid var(--line)" }} />
          <h4 style={{ margin: "0 0 8px" }}>Discord announcements</h4>
          <p className="muted">
            Paste a Discord webhook URL to auto-post an announcement whenever a new event is
            published.{" "}
            <a
              href="https://support.discord.com/hc/en-us/articles/228383668"
              rel="noreferrer"
              target="_blank"
            >
              How to create a webhook →
            </a>
          </p>
          <div className="field full" style={{ marginTop: 8 }}>
            <label htmlFor="discord-webhook">Webhook URL</label>
            <input
              id="discord-webhook"
              onChange={(e) => setDiscordWebhookUrl(e.target.value)}
              placeholder="https://discord.com/api/webhooks/..."
              type="url"
              value={discordWebhookUrl}
            />
          </div>
        </aside>
      </div>
    </form>
  );
}
