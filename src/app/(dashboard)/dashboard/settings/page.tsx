import { container, DEFAULT_ORGANIZATION_ID } from "@/infrastructure/container";
import Link from "next/link";
import { SettingsForm } from "./settings-form";
import { ThemeSelector } from "./theme-selector";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const settings = await container.settings.get(DEFAULT_ORGANIZATION_ID);

  if (!settings) {
    return null;
  }

  return (<><nav aria-label="Settings sections" className="settings-tabs"><Link className="active" href="/dashboard/settings">General</Link><Link href="/dashboard/settings/backups">Backups</Link></nav>
    <SettingsForm
      initial={{
        name: settings.name,
        contactEmail: settings.contactEmail,
        timezone: settings.timezone,
        waitlistsEnabledByDefault: settings.waitlistsEnabledByDefault,
        discordWebhookUrl: settings.discordWebhookUrl,
      }}
    />
    <ThemeSelector />
  </>);
}
