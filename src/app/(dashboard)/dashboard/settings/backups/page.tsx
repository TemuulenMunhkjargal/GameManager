import Link from "next/link";
import { BackupPanel } from "../backup-panel";

export default function BackupsPage() {
  return <><nav aria-label="Settings sections" className="settings-tabs"><Link href="/dashboard/settings">General</Link><Link className="active" href="/dashboard/settings/backups">Backups</Link></nav><div className="topbar"><div><p className="eyebrow">Settings</p><h1 className="page-title">Backups</h1><p className="page-copy">Download, restore, and remove local database snapshots.</p></div></div><BackupPanel /></>;
}
