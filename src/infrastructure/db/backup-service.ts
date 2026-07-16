import { closeSync, existsSync, mkdirSync, openSync, readdirSync, readFileSync, renameSync, statSync, unlinkSync, writeFileSync } from "node:fs";
import path from "node:path";
import Sqlite from "better-sqlite3";
import { initializeDatabase } from "./initialize";

export type BackupInfo = { fileName: string; createdAt: string; size: number; kind: "auto" | "manual" | "pre-restore" | "pre-migration" };

const TABLES = ["organizations", "member_profiles", "game_tables", "table_sessions", "table_seats", "game_systems", "events", "registrations", "payments", "announcements", "waitlist_entries", "leagues", "league_participants", "league_rounds", "league_matches", "league_match_entries", "league_stat_adjustments"] as const;
const BASE_GAMEHALL_TABLES = TABLES.slice(0, 12);
const SAFE_FILE = /^(auto|manual|pre-restore|pre-migration)-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z(?:-[a-f0-9]{8})?\.db$/;
const AUTOMATIC_BACKUP_LOCK_STALE_MS = 30 * 60 * 1000;

function timestamp(now: Date): string { return now.toISOString().replaceAll(":", "-").replace(".", "-"); }
function quoteIdentifier(value: string): string { return `"${value.replaceAll('"', '""')}"`; }

export class DatabaseBackupService {
  public readonly backupDirectory: string;
  public constructor(private readonly sqlite: Sqlite.Database, databasePath: string) {
    this.backupDirectory = path.join(path.dirname(databasePath), "backups");
    mkdirSync(this.backupDirectory, { recursive: true });
  }

  public async createBackup(kind: BackupInfo["kind"] = "manual", now = new Date()): Promise<BackupInfo> {
    mkdirSync(this.backupDirectory, { recursive: true });
    const fileName = `${kind}-${timestamp(now)}.db`;
    const finalPath = path.join(this.backupDirectory, fileName);
    const temporaryPath = `${finalPath}.tmp`;
    await this.sqlite.backup(temporaryPath);
    renameSync(temporaryPath, finalPath);
    return this.describe(fileName, kind);
  }

  public async ensureAutomaticBackup(now = new Date()): Promise<void> {
    mkdirSync(this.backupDirectory, { recursive: true });
    const day = now.toISOString().slice(0, 10);
    const lockPath = path.join(this.backupDirectory, `.automatic-${day}.lock`);
    const lock = this.acquireAutomaticBackupLock(lockPath);
    if (!lock) return;

    try {
      if (!this.listBackups().some((backup) => backup.kind === "auto" && backup.fileName.startsWith(`auto-${day}T`))) {
        await this.createBackup("auto", now);
      }
      const automatic = this.listBackups().filter((backup) => backup.kind === "auto").sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      for (const expired of automatic.slice(7)) {
        const expiredPath = this.resolveSafe(expired.fileName);
        if (existsSync(expiredPath)) unlinkSync(expiredPath);
      }
    } finally {
      closeSync(lock.handle);
      try {
        if (readFileSync(lockPath, "utf8") === lock.token) unlinkSync(lockPath);
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      }
    }
  }

  private acquireAutomaticBackupLock(lockPath: string): { handle: number; token: string } | null {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        const handle = openSync(lockPath, "wx");
        const token = crypto.randomUUID();
        try {
          writeFileSync(handle, token, "utf8");
          return { handle, token };
        } catch (error) {
          closeSync(handle);
          try { unlinkSync(lockPath); } catch { /* best effort cleanup */ }
          throw error;
        }
      } catch (error) {
        const code = (error as NodeJS.ErrnoException).code;
        if (code !== "EEXIST") throw error;

        try {
          const age = Date.now() - statSync(lockPath).mtimeMs;
          if (age < AUTOMATIC_BACKUP_LOCK_STALE_MS) return null;
          unlinkSync(lockPath);
        } catch (lockError) {
          const lockCode = (lockError as NodeJS.ErrnoException).code;
          if (lockCode === "ENOENT") continue;
          if (lockCode === "EACCES" || lockCode === "EPERM") return null;
          throw lockError;
        }
      }
    }

    return null;
  }

  public listBackups(): BackupInfo[] {
    mkdirSync(this.backupDirectory, { recursive: true });
    return readdirSync(this.backupDirectory).filter((fileName) => SAFE_FILE.test(fileName) && existsSync(path.join(this.backupDirectory, fileName))).map((fileName) => {
      const kind = fileName.startsWith("pre-restore-") ? "pre-restore" : fileName.startsWith("pre-migration-") ? "pre-migration" : fileName.startsWith("auto-") ? "auto" : "manual";
      return this.describe(fileName, kind);
    }).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  public readBackup(fileName: string): Buffer { return readFileSync(this.resolveSafe(fileName)); }

  public async restoreStoredBackup(fileName: string): Promise<void> { await this.restoreBuffer(this.readBackup(fileName)); }

  public async restoreBuffer(buffer: Buffer): Promise<void> {
    if (buffer.length < 100 || !buffer.subarray(0, 16).equals(Buffer.from("SQLite format 3\0"))) throw new Error("That file is not a SQLite database.");
    const stagingPath = path.join(this.backupDirectory, `.restore-staging-${crypto.randomUUID()}.db`);
    let source: Sqlite.Database | null = null;
    try {
      writeFileSync(stagingPath, buffer, { flag: "wx" });
      source = new Sqlite(stagingPath);
      const integrity = source.pragma("integrity_check", { simple: true });
      if (integrity !== "ok") throw new Error("The backup failed SQLite's integrity check.");
      const originalTables = new Set((source.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all() as { name: string }[]).map((row) => row.name));
      const missingCore = BASE_GAMEHALL_TABLES.filter((table) => !originalTables.has(table));
      if (missingCore.length) throw new Error(`The GameHall backup is incompatible. Missing: ${missingCore.join(", ")}.`);

      initializeDatabase(source);
      const sourceViolations = source.pragma("foreign_key_check") as unknown[];
      if (sourceViolations.length) throw new Error("The backup contains invalid relationships.");
      const sourceTables = new Set((source.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all() as { name: string }[]).map((row) => row.name));
      const missing = TABLES.filter((table) => !sourceTables.has(table));
      if (missing.length) throw new Error(`The GameHall backup is incompatible. Missing: ${missing.join(", ")}.`);
      const importSource = source;

      await this.createBackup("pre-restore");
      this.prune("pre-restore", 5);
      this.sqlite.pragma("foreign_keys = OFF");
      try {
        this.sqlite.transaction(() => {
          for (const table of [...TABLES].reverse()) this.sqlite.exec(`DELETE FROM ${quoteIdentifier(table)}`);
          for (const table of TABLES) {
            const columns = (importSource.pragma(`table_info(${quoteIdentifier(table)})`) as { name: string }[]).map((column) => column.name);
            const columnSql = columns.map(quoteIdentifier).join(", ");
            const parameters = columns.map((column) => `@${column}`).join(", ");
            const insert = this.sqlite.prepare(`INSERT INTO ${quoteIdentifier(table)} (${columnSql}) VALUES (${parameters})`);
            for (const row of importSource.prepare(`SELECT * FROM ${quoteIdentifier(table)}`).all()) insert.run(row as Record<string, unknown>);
          }
          const violations = this.sqlite.pragma("foreign_key_check") as unknown[];
          if (violations.length) throw new Error("The restored data contains invalid relationships.");
        })();
      } finally {
        this.sqlite.pragma("foreign_keys = ON");
      }
    } finally {
      source?.close();
      try { unlinkSync(stagingPath); } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      }
    }
  }

  private resolveSafe(fileName: string): string {
    if (!SAFE_FILE.test(fileName)) throw new Error("Invalid backup name.");
    return path.join(this.backupDirectory, fileName);
  }

  public deleteBackup(fileName: string): void {
    unlinkSync(this.resolveSafe(fileName));
  }

  private prune(kind: BackupInfo["kind"], keep: number): void {
    const matches = this.listBackups().filter((backup) => backup.kind === kind)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    for (const expired of matches.slice(keep)) unlinkSync(this.resolveSafe(expired.fileName));
  }

  private describe(fileName: string, kind: BackupInfo["kind"]): BackupInfo {
    const filePath = this.resolveSafe(fileName); const stats = statSync(filePath);
    return { fileName, createdAt: stats.mtime.toISOString(), size: stats.size, kind };
  }
}
