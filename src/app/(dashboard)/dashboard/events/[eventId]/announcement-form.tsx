"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Send, Clock } from "lucide-react";

type AnnouncementFormProps = {
  eventId: string;
  hasDiscordWebhook: boolean;
};

const AUDIENCES = [
  { value: "confirmed_attendees", label: "Confirmed attendees" },
  { value: "all_attendees", label: "Confirmed + waitlisted" },
  { value: "waitlisted", label: "Waitlist only" },
] as const;

function defaultScheduleValue(): string {
  const date = new Date();
  date.setHours(date.getHours() + 1, 0, 0, 0);
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60 * 1000);
  return local.toISOString().slice(0, 16);
}

export function AnnouncementForm({ eventId, hasDiscordWebhook }: AnnouncementFormProps) {
  const router = useRouter();
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [audience, setAudience] = useState<(typeof AUDIENCES)[number]["value"]>(
    "confirmed_attendees",
  );
  const [notifyDiscord, setNotifyDiscord] = useState(hasDiscordWebhook);
  const [sendMode, setSendMode] = useState<"now" | "schedule">("now");
  const [scheduledFor, setScheduledFor] = useState(defaultScheduleValue());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<{ count: number; scheduled: boolean } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setResult(null);

    const response = await fetch(`/api/events/${eventId}/announce`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subject,
        body,
        audience,
        notifyDiscord,
        scheduledFor: sendMode === "schedule" ? new Date(scheduledFor).toISOString() : null,
      }),
    });

    setIsSubmitting(false);

    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(data?.error ?? "Failed to send announcement.");
      return;
    }

    const data = (await response.json()) as {
      announcement: { recipientCount: number; status: string };
    };

    setResult({
      count: data.announcement.recipientCount,
      scheduled: data.announcement.status === "scheduled",
    });
    setSubject("");
    setBody("");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-grid">
        <div className="field full">
          <label htmlFor="ann-subject">Subject</label>
          <input
            id="ann-subject"
            onChange={(e) => setSubject(e.target.value)}
            required
            value={subject}
          />
        </div>
        <div className="field full">
          <label htmlFor="ann-body">Message</label>
          <textarea
            id="ann-body"
            onChange={(e) => setBody(e.target.value)}
            required
            rows={5}
            style={{ resize: "vertical" }}
            value={body}
          />
        </div>
        <div className="field">
          <label htmlFor="ann-audience">Audience</label>
          <select
            id="ann-audience"
            onChange={(e) =>
              setAudience(e.target.value as (typeof AUDIENCES)[number]["value"])
            }
            value={audience}
          >
            {AUDIENCES.map((a) => (
              <option key={a.value} value={a.value}>
                {a.label}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="ann-timing">When</label>
          <select
            id="ann-timing"
            onChange={(e) => setSendMode(e.target.value as "now" | "schedule")}
            value={sendMode}
          >
            <option value="now">Send now</option>
            <option value="schedule">Schedule for later</option>
          </select>
        </div>
        {sendMode === "schedule" ? (
          <div className="field">
            <label htmlFor="ann-scheduled-for">Send at</label>
            <input
              id="ann-scheduled-for"
              min={defaultScheduleValue()}
              onChange={(e) => setScheduledFor(e.target.value)}
              type="datetime-local"
              value={scheduledFor}
            />
          </div>
        ) : null}
        {hasDiscordWebhook ? (
          <div className="field" style={{ alignSelf: "end", paddingBottom: 8 }}>
            <label className="inline-line">
              <input
                checked={notifyDiscord}
                onChange={(e) => setNotifyDiscord(e.target.checked)}
                type="checkbox"
              />
              Also post to Discord
            </label>
          </div>
        ) : null}
      </div>

      {error ? <p className="notice error">{error}</p> : null}
      {result ? (
        <p className="notice">
          {result.scheduled ? (
            "Announcement scheduled."
          ) : (
            <>
              Sent to <strong>{result.count}</strong> recipient{result.count !== 1 ? "s" : ""}.
            </>
          )}
        </p>
      ) : null}

      <div className="form-actions" style={{ marginTop: 12 }}>
        <button className="button" disabled={isSubmitting} type="submit">
          {sendMode === "schedule" ? (
            <Clock aria-hidden="true" size={16} />
          ) : (
            <Send aria-hidden="true" size={16} />
          )}
          {isSubmitting
            ? sendMode === "schedule"
              ? "Scheduling…"
              : "Sending…"
            : sendMode === "schedule"
              ? "Schedule announcement"
              : "Send announcement"}
        </button>
      </div>
    </form>
  );
}
