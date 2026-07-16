import { existsSync, mkdtempSync, readFileSync, rmSync, utimesSync, writeFileSync } from "node:fs";
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

    const unrelatedPath = path.join(directory, "unrelated.db");
    const unrelated = new Sqlite(unrelatedPath);
    unrelated.exec("CREATE TABLE notes (id TEXT PRIMARY KEY)");
    unrelated.close();
    await expect(service.restoreBuffer(readFileSync(unrelatedPath))).rejects.toThrow("GameHall backup is incompatible");
  });

  it("migrates an older compatible backup before restoring it", async () => {
    sqlite.prepare("INSERT INTO member_profiles (id, organization_id, display_name) VALUES (?, ?, ?)")
      .run("member_legacy", "org_mana_vault", "Legacy Player");
    sqlite.prepare("INSERT INTO leagues (id, organization_id, game_system_label, name, description, format, status) VALUES (?, ?, ?, ?, ?, ?, ?)")
      .run("league_legacy", "org_mana_vault", "Chess", "Legacy League", "", "match_play", "active");
    const backup = await service.createBackup("manual", new Date("2030-01-02T00:00:00.000Z"));
    const legacy = new Sqlite(path.join(service.backupDirectory, backup.fileName));
    legacy.exec(`
      DROP TABLE league_match_entries;
      DROP TABLE league_matches;
      DROP TABLE league_rounds;
      DROP TABLE league_stat_adjustments;
      DROP TABLE league_participants;
      CREATE TABLE league_standings (
        id TEXT PRIMARY KEY,
        league_id TEXT NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
        member_profile_id TEXT NOT NULL REFERENCES member_profiles(id) ON DELETE CASCADE,
        wins INTEGER NOT NULL DEFAULT 0,
        losses INTEGER NOT NULL DEFAULT 0,
        draws INTEGER NOT NULL DEFAULT 0,
        bonus_points INTEGER NOT NULL DEFAULT 0
      );
      INSERT INTO league_standings (id, league_id, member_profile_id, wins, losses, draws, bonus_points)
      VALUES ('standing_legacy', 'league_legacy', 'member_legacy', 3, 1, 0, 2);
      PRAGMA user_version = 2;
    `);
    legacy.close();

    await service.restoreStoredBackup(backup.fileName);

    expect(sqlite.prepare("SELECT member_profile_id AS memberId FROM league_participants WHERE league_id = ?")
      .get("league_legacy")).toEqual({ memberId: "member_legacy" });
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

  it("recovers a stale automatic backup lock left by a crashed process", async () => {
    const now = new Date("2030-02-02T00:00:00.000Z");
    const lockPath = path.join(service.backupDirectory, ".automatic-2030-02-02.lock");
    writeFileSync(lockPath, "abandoned-lock");
    const stale = new Date(Date.now() - 31 * 60 * 1000);
    utimesSync(lockPath, stale, stale);

    await service.ensureAutomaticBackup(now);

    expect(service.listBackups().filter((backup) => backup.kind === "auto")).toHaveLength(1);
    expect(existsSync(lockPath)).toBe(false);
  });

  it("does not steal a fresh automatic backup lock", async () => {
    const now = new Date("2030-02-03T00:00:00.000Z");
    const lockPath = path.join(service.backupDirectory, ".automatic-2030-02-03.lock");
    writeFileSync(lockPath, "active-lock");

    await service.ensureAutomaticBackup(now);

    expect(service.listBackups().filter((backup) => backup.kind === "auto")).toHaveLength(0);
    expect(existsSync(lockPath)).toBe(true);
  });

  it("deletes a stored backup", async () => {
    const backup = await service.createBackup("manual"); service.deleteBackup(backup.fileName);
    expect(service.listBackups()).toHaveLength(0);
  });
});
