import { copyFileSync, cpSync, existsSync, mkdirSync, statSync } from "node:fs";
import path from "node:path";
import Sqlite from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";
import { initializeDatabase, LATEST_SCHEMA_VERSION } from "./initialize";
import { DatabaseBackupService } from "./backup-service";

declare global {
  var __gameHallSqlite: Sqlite.Database | undefined;
}

function getDatabasePath(): string {
  const configuredPath = process.env.GAMEHALL_DB_PATH;
  if (configuredPath) {
    return configuredPath;
  }

  const databasePath = path.join(".gamehall", "gamehall.db");
  const legacyPath = path.join(".crittable", "crittable.db");
  if (!existsSync(/* turbopackIgnore: true */ databasePath) && existsSync(/* turbopackIgnore: true */ legacyPath)) {
    mkdirSync(/* turbopackIgnore: true */ path.dirname(databasePath), { recursive: true });
    for (const suffix of ["", "-wal", "-shm"]) {
      if (existsSync(/* turbopackIgnore: true */ `${legacyPath}${suffix}`)) {
        copyFileSync(
          /* turbopackIgnore: true */ `${legacyPath}${suffix}`,
          /* turbopackIgnore: true */ `${databasePath}${suffix}`,
        );
      }
    }
    const oldBackups = path.join(/* turbopackIgnore: true */ path.dirname(legacyPath), "backups");
    const newBackups = path.join(/* turbopackIgnore: true */ path.dirname(databasePath), "backups");
    if (
      existsSync(/* turbopackIgnore: true */ oldBackups)
      && !existsSync(/* turbopackIgnore: true */ newBackups)
    ) {
      cpSync(/* turbopackIgnore: true */ oldBackups, /* turbopackIgnore: true */ newBackups, { recursive: true });
    }
  }
  return databasePath;
}

const databasePath = getDatabasePath();
mkdirSync(/* turbopackIgnore: true */ path.dirname(databasePath), { recursive: true });

const sqlite = globalThis.__gameHallSqlite ?? new Sqlite(databasePath);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");
sqlite.pragma("busy_timeout = 5000");
const currentVersion = sqlite.pragma("user_version", { simple: true }) as number;
const hasExistingSchema = existsSync(/* turbopackIgnore: true */ databasePath)
  && statSync(/* turbopackIgnore: true */ databasePath).size > 0 &&
  !!sqlite.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'organizations'").get();
if (hasExistingSchema && currentVersion < LATEST_SCHEMA_VERSION) {
  const backupDirectory = path.join(/* turbopackIgnore: true */ path.dirname(databasePath), "backups");
  mkdirSync(/* turbopackIgnore: true */ backupDirectory, { recursive: true });
  const stamp = new Date().toISOString().replaceAll(":", "-").replace(".", "-");
  const migrationBackup = path.join(
    /* turbopackIgnore: true */ backupDirectory,
    `pre-migration-${stamp}-${crypto.randomUUID().slice(0, 8)}.db`,
  ).replaceAll("'", "''");
  sqlite.exec(`VACUUM INTO '${migrationBackup}'`);
}
initializeDatabase(sqlite);
export const backupService = new DatabaseBackupService(sqlite, databasePath);
const automaticBackupsDisabled = process.env.GAMEHALL_DISABLE_AUTO_BACKUP;
if (process.env.NODE_ENV !== "test" && automaticBackupsDisabled !== "1") {
  void backupService.ensureAutomaticBackup().catch((error) => console.error("[backup] automatic backup failed", error));
}

if (process.env.NODE_ENV !== "production") {
  globalThis.__gameHallSqlite = sqlite;
}

export const db = drizzle(sqlite, { schema });
export type Database = typeof db;
export { databasePath };
