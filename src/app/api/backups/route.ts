import { NextResponse } from "next/server";
import { backupService } from "@/infrastructure/db/client";
import { z } from "zod";

export async function GET() { return NextResponse.json({ backups: backupService.listBackups() }); }
export async function POST() { return NextResponse.json({ backup: await backupService.createBackup("manual") }, { status: 201 }); }

const deleteSchema = z.union([z.object({ all: z.literal(true) }), z.object({ fileNames: z.array(z.string()).min(1).max(500) })]);
export async function DELETE(request: Request) {
  const parsed = deleteSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Choose at least one backup." }, { status: 400 });
  const existing = new Set(backupService.listBackups().map((backup) => backup.fileName));
  const names = "all" in parsed.data ? [...existing] : parsed.data.fileNames.filter((name) => existing.has(name));
  for (const name of names) backupService.deleteBackup(name);
  return NextResponse.json({ deleted: names.length });
}
