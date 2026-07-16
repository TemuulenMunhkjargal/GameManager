"use client";

import { Clock, Send } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { messageFromRequestError, requestJson } from "@/lib/api-client";

type AnnouncementFormProps = {
  eventId: string;
  hasDiscordWebhook: boolean;
};

type AnnouncementResponse = {
  announcement: { deliveredToDiscord: boolean; status: string };
};

function defaultScheduleValue(): string {
  const date = new Date();
  date.setHours(date.getHours() + 1, 0, 0, 0);
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60 * 1000).toISOString().slice(0, 16);
}

export function AnnouncementForm({ eventId, hasDiscordWebhook }: AnnouncementFormProps) {
  const router = useRouter();
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sendMode, setSendMode] = useState<"now" | "schedule">("now");
  const [scheduledFor, setScheduledFor] = useState(defaultScheduleValue());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<"posted" | "scheduled" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setResult(null);

    try {
      const data = await requestJson<AnnouncementResponse>(`/api/events/${eventId}/announce`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject,
          body,
          scheduledFor: sendMode === "schedule" ? new Date(scheduledFor).toISOString() : null,
        }),
      });
      setResult(data.announcement.status === "scheduled" ? "scheduled" : "posted");
      setSubject("");
      setBody("");
      router.refresh();
    } catch (requestError) {
      setError(messageFromRequestError(requestError, "Unable to post the Discord announcement."));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {!hasDiscordWebhook ? (
        <p className="notice">
          Connect a Discord channel in <a href="/dashboard/settings">Settings</a> before posting announcements.
        </p>
      ) : null}
      <div className="form-grid">
        <div className="field full">
          <label htmlFor="ann-subject">Discord post title</label>
          <input
            disabled={!hasDiscordWebhook}
            id="ann-subject"
            onChange={(event) => setSubject(event.target.value)}
            required
            value={subject}
          />
        </div>
        <div className="field full">
          <label htmlFor="ann-body">Message</label>
          <textarea
            disabled={!hasDiscordWebhook}
            id="ann-body"
            onChange={(event) => setBody(event.target.value)}
            required
            rows={5}
            style={{ resize: "vertical" }}
            value={body}
          />
        </div>
        <div className="field">
          <label htmlFor="ann-timing">When</label>
          <select
            disabled={!hasDiscordWebhook}
            id="ann-timing"
            onChange={(event) => setSendMode(event.target.value as "now" | "schedule")}
            value={sendMode}
          >
            <option value="now">Post now</option>
            <option value="schedule">Schedule for later</option>
          </select>
        </div>
        {sendMode === "schedule" ? (
          <div className="field">
            <label htmlFor="ann-scheduled-for">Post at</label>
            <input
              disabled={!hasDiscordWebhook}
              id="ann-scheduled-for"
              min={defaultScheduleValue()}
              onChange={(event) => setScheduledFor(event.target.value)}
              type="datetime-local"
              value={scheduledFor}
            />
          </div>
        ) : null}
      </div>

      {error ? <p className="notice error">{error}</p> : null}
      {result ? (
        <p className="notice success">
          {result === "scheduled" ? "Discord announcement scheduled." : "Announcement posted to Discord."}
        </p>
      ) : null}

      <div className="form-actions" style={{ marginTop: 12 }}>
        <button className="button" disabled={isSubmitting || !hasDiscordWebhook} type="submit">
          {sendMode === "schedule" ? <Clock aria-hidden="true" size={16} /> : <Send aria-hidden="true" size={16} />}
          {isSubmitting
            ? sendMode === "schedule" ? "Scheduling…" : "Posting…"
            : sendMode === "schedule" ? "Schedule Discord post" : "Post to Discord"}
        </button>
      </div>
    </form>
  );
}
