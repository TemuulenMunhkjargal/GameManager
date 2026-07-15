import { NextResponse } from "next/server";
import { backupService } from "@/infrastructure/db/client";

export async function GET(_request: Request, { params }: { params: Promise<{ fileName: string }> }) {
  try { const fileName = (await params).fileName; return new Response(new Uint8Array(backupService.readBackup(fileName)), { headers: { "Content-Type": "application/vnd.sqlite3", "Content-Disposition": `attachment; filename="${fileName}"`, "Cache-Control": "no-store" } }); }
  catch { return NextResponse.json({ error: "Backup not found." }, { status: 404 }); }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ fileName: string }> }) {
  try { backupService.deleteBackup((await params).fileName); return NextResponse.json({ ok: true }); }
  catch { return NextResponse.json({ error: "Backup not found." }, { status: 404 }); }
}
