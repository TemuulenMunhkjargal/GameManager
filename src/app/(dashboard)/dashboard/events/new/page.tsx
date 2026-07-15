import Link from "next/link";
import { CreateEventForm } from "./create-event-form";
import { container, DEFAULT_ORGANIZATION_ID } from "@/infrastructure/container";

export default async function NewEventPage() {
  const systems = await container.gameSystems.listForOrganization(DEFAULT_ORGANIZATION_ID);
  return (
    <>
      <div className="topbar">
        <div>
          <p className="eyebrow">Event setup</p>
          <h1 className="page-title">Create event</h1>
          <p className="page-copy">
            Choose a game, time, and players for your next local game night.
          </p>
        </div>
        <Link className="button secondary" href="/dashboard/events">
          Back to events
        </Link>
      </div>

      <div className="panel form-panel">
        <CreateEventForm systems={systems.map((system) => ({ id: system.id, name: system.name, defaultCapacity: system.defaultCapacity }))} />
      </div>
    </>
  );
}

