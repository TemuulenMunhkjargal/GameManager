export const dynamic = "force-dynamic";

import { container, DEFAULT_ORGANIZATION_ID, resolveActor } from "@/infrastructure/container";
import { VenueList } from "./venue-list";

export default async function VenuesPage() {
  const [venues, actor] = await Promise.all([
    container.venues.listForOrganization(DEFAULT_ORGANIZATION_ID, { includeArchived: true }),
    resolveActor(DEFAULT_ORGANIZATION_ID),
  ]);

  const canManage = actor?.membership?.canManageEvents() ?? false;

  return (
    <>
      <div className="topbar">
        <div>
          <p className="eyebrow">Operations</p>
          <h1 className="page-title">Venues &amp; Rooms</h1>
          <p className="page-copy">
            Manage your store locations and play spaces. Events can reference specific venues and
            rooms for capacity planning and scheduling.
          </p>
        </div>
      </div>

      <section className="grid columns-3" aria-label="Venue stats">
        <div className="panel stat">
          <p className="stat-label">Active venues</p>
          <p className="stat-value">{venues.filter((v) => v.status === "active").length}</p>
        </div>
        <div className="panel stat">
          <p className="stat-label">Total rooms</p>
          <p className="stat-value">
            {venues.filter((v) => v.status === "active").reduce((sum, v) => sum + v.rooms.length, 0)}
          </p>
        </div>
        <div className="panel stat">
          <p className="stat-label">Total capacity</p>
          <p className="stat-value">
            {venues
              .filter((v) => v.status === "active")
              .reduce((sum, v) => sum + v.rooms.reduce((s, r) => s + (r.capacity ?? 0), 0), 0) || "—"}
          </p>
        </div>
      </section>

      <div className="toolbar">
        <h2>Your venues</h2>
      </div>

      <VenueList canManage={canManage} venues={venues} />
    </>
  );
}
