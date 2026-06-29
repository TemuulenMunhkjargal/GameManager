import { container, DEFAULT_ORGANIZATION_ID } from "@/infrastructure/container";


export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const settings = await container.settings.get(DEFAULT_ORGANIZATION_ID);

  if (!settings) {
    return null;
  }

  return (
    <>
      <div className="topbar">
        <div>
          <p className="eyebrow">Workspace</p>
          <h1 className="page-title">Settings</h1>
          <p className="page-copy">
            Store profile, public signup defaults, and operational preferences. These are static for
            now and ready to become editable once persistence is added.
          </p>
        </div>
        <button className="button" type="button">
          Save changes
        </button>
      </div>

      <div className="detail-layout">
        <section className="panel form-panel">
          <h2>Organization profile</h2>
          <div className="form-grid">
            <div className="field">
              <label htmlFor="name">Store name</label>
              <input id="name" defaultValue={settings.name} />
            </div>
            <div className="field">
              <label htmlFor="slug">Public slug</label>
              <input id="slug" defaultValue={settings.publicSlug} />
            </div>
            <div className="field">
              <label htmlFor="email">Contact email</label>
              <input id="email" defaultValue={settings.contactEmail} type="email" />
            </div>
            <div className="field">
              <label htmlFor="timezone">Timezone</label>
              <input id="timezone" defaultValue={settings.timezone} />
            </div>
            <div className="field full">
              <label htmlFor="venue">Default venue</label>
              <input id="venue" defaultValue={settings.defaultVenueName} />
            </div>
          </div>
        </section>

        <aside className="panel detail-panel">
          <h3>Public signup defaults</h3>
          <div className="settings-list">
            <div>
              <strong>Public pages</strong>
              <span className="badge">{settings.publicPageEnabled ? "enabled" : "disabled"}</span>
            </div>
            <div>
              <strong>Waitlists</strong>
              <span className="badge">
                {settings.waitlistsEnabledByDefault ? "default on" : "default off"}
              </span>
            </div>
            <div>
              <strong>Public URL</strong>
              <span>/stores/{settings.publicSlug}</span>
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}
