import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import Sqlite from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { initializeDatabase } from "../../src/infrastructure/db/initialize";
import { DatabaseBackupService } from "../../src/infrastructure/db/backup-service";

describe("DatabaseBackupService", () => {
  let directory: string; let sqlite: Sqlite.Database; let service: DatabaseBackupService;
  beforeEach(() => { directory = mkdtempSync(path.join(os.tmpdir(), "gamehall-backup-test-")); const databasePath = path.join(directory, "gamehall.db"); sqlite = new Sqlite(databasePath); sqlite.pragma("foreign_keys = ON"); initializeDatabase(sqlite); service = new DatabaseBackupService(sqlite, databasePath); });
  afterEach(() => { if (sqlite.open) sqlite.close(); rmSync(directory, { recursive: true, force: true }); });

  it("restores a verified snapshot and creates a safety backup", async () => {
    sqlite.prepare("INSERT INTO member_profiles (id, organization_id, display_name) VALUES (?, ?, ?)").run("member_1", "org_mana_vault", "Before");
    const backup = await service.createBackup("manual", new Date("2030-01-01T00:00:00.000Z"));
    sqlite.prepare("UPDATE member_profiles SET display_name = ? WHERE id = ?").run("After", "member_1");
    await service.restoreStoredBackup(backup.fileName);
    expect((sqlite.prepare("SELECT display_name AS name FROM member_profiles WHERE id = ?").get("member_1") as { name: string }).name).toBe("Before");
    expect(service.listBackups().some((item) => item.kind === "pre-restore")).toBe(true);
  });

  it("rejects files that are not GameHall databases", async () => {
    await expect(service.restoreBuffer(Buffer.from("not a database"))).rejects.toThrow("not a SQLite");
  });

  it("retains only seven daily automatic backups", async () => {
    for (let day = 1; day <= 9; day += 1) await service.ensureAutomaticBackup(new Date(`2030-01-${String(day).padStart(2, "0")}T00:00:00.000Z`));
    expect(service.listBackups().filter((backup) => backup.kind === "auto")).toHaveLength(7);
  });

  it("prevents concurrent workers from creating the same automatic backup", async () => {
    const now = new Date("2030-02-01T00:00:00.000Z");
    await Promise.all([service.ensureAutomaticBackup(now), service.ensureAutomaticBackup(now)]);
    expect(service.listBackups().filter((backup) => backup.kind === "auto")).toHaveLength(1);
  });

  it("deletes a stored backup", async () => {
    const backup = await service.createBackup("manual"); service.deleteBackup(backup.fileName);
    expect(service.listBackups()).toHaveLength(0);
  });
});
