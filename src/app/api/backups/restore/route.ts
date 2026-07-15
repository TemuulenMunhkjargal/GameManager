import { NextResponse } from "next/server";
import { backupService } from "@/infrastructure/db/client";

export async function POST(request: Request) {
  const form = await request.formData(); const file = form.get("backup");
  if (!(file instanceof File)) return NextResponse.json({ error: "Choose a GameHall backup file." }, { status: 400 });
  if (file.size > 200 * 1024 * 1024) return NextResponse.json({ error: "Backup files must be under 200 MB." }, { status: 413 });
  try { await backupService.restoreBuffer(Buffer.from(await file.arrayBuffer())); return NextResponse.json({ ok: true }); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Restore failed." }, { status: 400 }); }
}
