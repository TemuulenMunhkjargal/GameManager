import { backupService } from "@/infrastructure/db/client";

export async function GET() {
  const backup = await backupService.createBackup("manual");
  return new Response(new Uint8Array(backupService.readBackup(backup.fileName)), { headers: { "Content-Type": "application/vnd.sqlite3", "Content-Disposition": `attachment; filename="${backup.fileName}"`, "Cache-Control": "no-store" } });
}
