import { closeSync, existsSync, mkdirSync, openSync, readdirSync, readFileSync, renameSync, statSync, unlinkSync } from "node:fs";
import path from "node:path";
import Sqlite from "better-sqlite3";

export type BackupInfo = { fileName: string; createdAt: string; size: number; kind: "auto" | "manual" | "pre-restore" | "pre-migration" };

const TABLES = ["organizations", "member_profiles", "game_tables", "table_sessions", "table_seats", "game_systems", "events", "registrations", "payments", "announcements", "waitlist_entries", "leagues", "league_standings"] as const;
const SAFE_FILE = /^(auto|manual|pre-restore|pre-migration)-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z(?:-[a-f0-9]{8})?\.db$/;

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
    const day = now.toISOString().slice(0, 10);
    const lockPath = path.join(this.backupDirectory, `.automatic-${day}.lock`);
    let lock: number;
    try {
      lock = openSync(lockPath, "wx");
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "EEXIST") return;
      throw error;
    }
    try {
      if (!this.listBackups().some((backup) => backup.kind === "auto" && backup.createdAt.startsWith(day))) {
        await this.createBackup("auto", now);
      }
      const automatic = this.listBackups().filter((backup) => backup.kind === "auto").sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      for (const expired of automatic.slice(7)) {
        const expiredPath = this.resolveSafe(expired.fileName);
        if (existsSync(expiredPath)) unlinkSync(expiredPath);
      }
    } finally {
      closeSync(lock);
      if (existsSync(lockPath)) unlinkSync(lockPath);
    }
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
    const source = new Sqlite(buffer, { readonly: true });
    try {
      const integrity = source.pragma("integrity_check", { simple: true });
      if (integrity !== "ok") throw new Error("The backup failed SQLite's integrity check.");
      const sourceViolations = source.pragma("foreign_key_check") as unknown[];
      if (sourceViolations.length) throw new Error("The backup contains invalid relationships.");
      const sourceTables = new Set((source.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all() as { name: string }[]).map((row) => row.name));
      const missing = TABLES.filter((table) => !sourceTables.has(table));
      if (missing.length) throw new Error(`The GameHall backup is incompatible. Missing: ${missing.join(", ")}.`);

      await this.createBackup("pre-restore");
      this.prune("pre-restore", 5);
      this.sqlite.pragma("foreign_keys = OFF");
      try {
        this.sqlite.transaction(() => {
          for (const table of [...TABLES].reverse()) this.sqlite.exec(`DELETE FROM ${quoteIdentifier(table)}`);
          for (const table of TABLES) {
            const columns = (source.pragma(`table_info(${quoteIdentifier(table)})`) as { name: string }[]).map((column) => column.name);
            const columnSql = columns.map(quoteIdentifier).join(", ");
            const parameters = columns.map((column) => `@${column}`).join(", ");
            const insert = this.sqlite.prepare(`INSERT INTO ${quoteIdentifier(table)} (${columnSql}) VALUES (${parameters})`);
            for (const row of source.prepare(`SELECT * FROM ${quoteIdentifier(table)}`).all()) insert.run(row as Record<string, unknown>);
          }
        })();
      } finally {
        this.sqlite.pragma("foreign_keys = ON");
      }
      const violations = this.sqlite.pragma("foreign_key_check") as unknown[];
      if (violations.length) throw new Error("The restored data contains invalid relationships.");
    } finally {
      source.close();
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
