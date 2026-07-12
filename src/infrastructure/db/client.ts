import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

declare global {
  // eslint-disable-next-line no-var
  var __critTableSql: ReturnType<typeof postgres> | undefined;
}

function getConnectionString(): string {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not set. Copy .env.example to .env.local and point it at your Postgres instance " +
        "(docker compose up -d gets you one locally).",
    );
  }

  return connectionString;
}

// Next.js dev mode reloads modules on every request; stash the pool on
// globalThis so we don't open a new Postgres connection pool each time.
const sql = globalThis.__critTableSql ?? postgres(getConnectionString(), { max: 10 });

if (process.env.NODE_ENV !== "production") {
  globalThis.__critTableSql = sql;
}

export const db = drizzle(sql, { schema });
export type Database = typeof db;
