import Link from "next/link";
import { CreateEventForm } from "./create-event-form";

export default function NewEventPage() {
  return (
    <>
      <div className="topbar">
        <div>
          <p className="eyebrow">Event setup</p>
          <h1 className="page-title">Create event</h1>
          <p className="page-copy">
            Publish a public signup page and start tracking registrations immediately.
          </p>
        </div>
        <Link className="button secondary" href="/dashboard/events">
          Back to events
        </Link>
      </div>

      <div className="panel form-panel">
        <CreateEventForm />
      </div>
    </>
  );
}

