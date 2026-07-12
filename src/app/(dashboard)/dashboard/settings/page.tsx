import { container, DEFAULT_ORGANIZATION_ID, resolveActor } from "@/infrastructure/container";
import { SettingsForm } from "./settings-form";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const actor = await resolveActor(DEFAULT_ORGANIZATION_ID);
  const settings = await container.settings.get(DEFAULT_ORGANIZATION_ID);

  if (!settings) {
    return null;
  }

  const canManage = actor?.membership?.canManageTeam() ?? false;

  if (!canManage) {
    return (
      <>
        <div className="topbar">
          <div>
            <p className="eyebrow">Workspace</p>
            <h1 className="page-title">Settings</h1>
          </div>
        </div>
        <p className="notice">Only an owner or admin can view and change organization settings.</p>
      </>
    );
  }

  return (
    <SettingsForm
      publicSlug={settings.publicSlug}
      initial={{
        name: settings.name,
        contactEmail: settings.contactEmail,
        timezone: settings.timezone,
        defaultVenueName: settings.defaultVenueName,
        publicPageEnabled: settings.publicPageEnabled,
        waitlistsEnabledByDefault: settings.waitlistsEnabledByDefault,
        discordWebhookUrl: settings.discordWebhookUrl,
      }}
    />
  );
}
