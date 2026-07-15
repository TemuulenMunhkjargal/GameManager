import { Armchair, Clock3, Users } from "lucide-react";
import { container, DEFAULT_ORGANIZATION_ID } from "@/infrastructure/container";
import { TableBoard } from "./table-board";

export const dynamic = "force-dynamic";

export default async function TablesPage() {
  const [tables, members] = await Promise.all([
    container.tables.listForOrganization(DEFAULT_ORGANIZATION_ID),
    container.members.listForOrganization(DEFAULT_ORGANIZATION_ID),
  ]);
  const activeTables = tables.filter((table) => table.status === "active");
  const occupied = activeTables.filter((table) => table.occupants.length > 0);
  const guestCount = activeTables.reduce((sum, table) => sum + table.occupants.length, 0);

  return (
    <>
      <div className="topbar">
        <div>
          <p className="eyebrow">Live floor</p>
          <h1 className="page-title">Tables</h1>
          <p className="page-copy">
            Seat players and walk-in guests, move groups as the night changes, and see how long every table has been occupied.
          </p>
        </div>
      </div>
      <section className="grid columns-3" aria-label="Live table stats">
        <div className="panel stat"><Armchair size={18} /><p className="stat-label">Ready tables</p><p className="stat-value">{activeTables.length - occupied.length}</p></div>
        <div className="panel stat"><Clock3 size={18} /><p className="stat-label">Occupied now</p><p className="stat-value">{occupied.length}</p></div>
        <div className="panel stat"><Users size={18} /><p className="stat-label">Players seated</p><p className="stat-value">{guestCount}</p></div>
      </section>
      <TableBoard members={members} tables={tables} />
    </>
  );
}
