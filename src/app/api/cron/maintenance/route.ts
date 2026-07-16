import { NextResponse } from "next/server";
import { container, DEFAULT_ORGANIZATION_ID } from "@/infrastructure/container";
import { backupService } from "@/infrastructure/db/client";

/** Invoked periodically by Electron so maintenance continues while the app remains open. */
export async function POST(request: Request) {
  const expectedSecret = process.env.CRON_SECRET;
  const provided = request.headers.get("authorization")?.replace("Bearer ", "");
  if (expectedSecret && provided !== expectedSecret) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const now = new Date();
  const backupsDisabled = process.env.GAMEHALL_DISABLE_AUTO_BACKUP === "1";
  if (!backupsDisabled) await backupService.ensureAutomaticBackup(now);

  const archive = await container.useCases.maintainEventArchive.execute({
    organizationId: DEFAULT_ORGANIZATION_ID,
    now,
  });

  return NextResponse.json({
    ok: true,
    automaticBackupChecked: !backupsDisabled,
    purgedArchivedEvents: archive.purged,
  });
}
