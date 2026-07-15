import { Gamepad2 } from "lucide-react";
import { container, DEFAULT_ORGANIZATION_ID, resolveActor } from "@/infrastructure/container";
import { AddGameSystemForm } from "./add-game-system-form";
import { ArchiveGameSystemButton } from "./archive-game-system-button";

export const dynamic = "force-dynamic";

export default async function GameSystemsPage() {
  const actor = await resolveActor(DEFAULT_ORGANIZATION_ID);
  const canManage = actor?.membership?.canManageEvents() ?? false;
  const systems = await container.gameSystems.listForOrganization(DEFAULT_ORGANIZATION_ID, {
    includeArchived: true,
  });

  return (
    <>
      <div className="topbar">
        <div>
          <p className="eyebrow">Catalog</p>
          <h1 className="page-title">Game systems</h1>
          <p className="page-copy">
            Add the games your group plays so event setup can inherit
            formats, capacities, rules, and registration defaults.
          </p>
        </div>
        {canManage ? <AddGameSystemForm /> : null}
      </div>

      <section className="grid columns-3" aria-label="Game system stats">
        <div className="panel stat">
          <p className="stat-label">Configured systems</p>
          <p className="stat-value">{systems.filter((s) => s.status === "active").length}</p>
        </div>
        <div className="panel stat">
          <p className="stat-label">Active event systems</p>
          <p className="stat-value">
            {systems.filter((system) => system.status === "active" && system.activeEventCount > 0).length}
          </p>
        </div>
        <div className="panel stat">
          <p className="stat-label">Default seats</p>
          <p className="stat-value">
            {(() => {
              const active = systems.filter((s) => s.status === "active");
              return active.length === 0
                ? "—"
                : Math.round(
                    active.reduce((total, system) => total + system.defaultCapacity, 0) / active.length,
                  );
            })()}
          </p>
        </div>
      </section>

      <div className="game-grid">
        {systems.map((system) => (
          <article className="panel detail-panel" key={system.id} style={{ opacity: system.status === "archived" ? 0.6 : 1 }}>
            <div className="system-heading">
              <div className="system-icon">
                <Gamepad2 aria-hidden="true" size={20} />
              </div>
              <div>
                <h2>{system.name}</h2>
                <p>{system.type === "other" && system.notes.startsWith("Category: ") ? system.notes.split("\n")[0].slice(10) : system.type.replace("_", " ")}</p>
              </div>
              {system.status === "archived" ? <span className="badge warning">archived</span> : null}
            </div>
            <p>{system.type === "other" && system.notes.startsWith("Category: ") ? system.notes.split("\n").slice(1).join("\n") : system.notes}</p>
            <div className="metric-row">
              <span>
                <strong>{system.defaultCapacity}</strong>
                <small>default seats</small>
              </span>
              <span>
                <strong>{system.activeEventCount}</strong>
                <small>active events</small>
              </span>
            </div>
            {canManage ? (
              <div className="form-actions" style={{ marginTop: 12 }}>
                <ArchiveGameSystemButton
                  gameSystemId={system.id}
                  isArchived={system.status === "archived"}
                />
              </div>
            ) : null}
          </article>
        ))}
      </div>
    </>
  );
}

