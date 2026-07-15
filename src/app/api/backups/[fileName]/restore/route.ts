import { NextResponse } from "next/server";
import { backupService } from "@/infrastructure/db/client";

export async function POST(_request: Request, { params }: { params: Promise<{ fileName: string }> }) {
  try { await backupService.restoreStoredBackup((await params).fileName); return NextResponse.json({ ok: true }); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Restore failed." }, { status: 400 }); }
}
