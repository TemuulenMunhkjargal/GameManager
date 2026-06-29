import { config } from "dotenv";

config({ path: ".env.local" });
config(); // fall back to plain .env if .env.local isn't present

import type { Config } from "drizzle-kit";

export default {
  schema: "./src/infrastructure/db/schema.ts",
  out: "./src/infrastructure/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "postgres://crittable:crittable@localhost:5432/crittable",
  },
} satisfies Config;
