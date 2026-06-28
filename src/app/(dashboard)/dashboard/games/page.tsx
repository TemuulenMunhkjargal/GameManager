import { Gamepad2, Plus } from "lucide-react";
import { listGameSystems } from "@/lib/crit-table-store";

export default function GameSystemsPage() {
  const systems = listGameSystems();

  return (
    <>
      <div className="topbar">
        <div>
          <p className="eyebrow">Catalog</p>
          <h1 className="page-title">Game systems</h1>
          <p className="page-copy">
            Configure the hobby systems your store runs so event setup can eventually inherit
            formats, capacities, rules, and registration defaults.
          </p>
        </div>
        <button className="button" type="button">
          <Plus aria-hidden="true" size={18} />
          Add system
        </button>
      </div>

      <section className="grid columns-3" aria-label="Game system stats">
        <div className="panel stat">
          <p className="stat-label">Configured systems</p>
          <p className="stat-value">{systems.length}</p>
        </div>
        <div className="panel stat">
          <p className="stat-label">Active event systems</p>
          <p className="stat-value">
            {systems.filter((system) => system.activeEventCount > 0).length}
          </p>
        </div>
        <div className="panel stat">
          <p className="stat-label">Default seats</p>
          <p className="stat-value">
            {Math.round(
              systems.reduce((total, system) => total + system.defaultCapacity, 0) /
                systems.length,
            )}
          </p>
        </div>
      </section>

      <div className="game-grid">
        {systems.map((system) => (
          <article className="panel detail-panel" key={system.id}>
            <div className="system-heading">
              <div className="system-icon">
                <Gamepad2 aria-hidden="true" size={20} />
              </div>
              <div>
                <h2>{system.name}</h2>
                <p>{system.type.replace("_", " ")}</p>
              </div>
            </div>
            <p>{system.notes}</p>
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
          </article>
        ))}
      </div>
    </>
  );
}

