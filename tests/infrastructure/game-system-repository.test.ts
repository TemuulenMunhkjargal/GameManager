import Sqlite from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import * as schema from "../../src/infrastructure/db/schema";
import { initializeDatabase } from "../../src/infrastructure/db/initialize";
import { DrizzleGameSystemQueries } from "../../src/infrastructure/db/repositories/game-system-queries";

describe("DrizzleGameSystemQueries", () => {
  let sqlite: Sqlite.Database;
  let repository: DrizzleGameSystemQueries;
  let queries: string[];

  beforeEach(() => {
    queries = [];
    sqlite = new Sqlite(":memory:", { verbose: (query) => queries.push(String(query)) });
    sqlite.pragma("foreign_keys = ON");
    initializeDatabase(sqlite);
    repository = new DrizzleGameSystemQueries(drizzle(sqlite, { schema }));
  });

  afterEach(() => sqlite.close());

  it("counts active events for every game in one query", async () => {
    sqlite.prepare("INSERT INTO game_systems (id, organization_id, name, slug, type) VALUES (?, ?, ?, ?, ?)")
      .run("game_magic", "org_mana_vault", "Magic", "magic", "tcg");
    sqlite.prepare("INSERT INTO game_systems (id, organization_id, name, slug, type) VALUES (?, ?, ?, ?, ?)")
      .run("game_chess", "org_mana_vault", "Chess", "chess", "board_game");
    const insertEvent = sqlite.prepare("INSERT INTO events (id, organization_id, title, status, starts_at, ends_at, capacity, game_system_id, game_system_label) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
    insertEvent.run("event_linked", "org_mana_vault", "Linked", "published", 1_900_000_000, 1_900_003_600, 8, "game_magic", "Renamed Magic");
    insertEvent.run("event_legacy", "org_mana_vault", "Legacy", "published", 1_900_000_000, 1_900_003_600, 8, null, "Magic");
    insertEvent.run("event_draft", "org_mana_vault", "Draft", "draft", 1_900_000_000, 1_900_003_600, 8, "game_magic", "Magic");

    queries = [];
    const games = await repository.listForOrganization("org_mana_vault");
    expect(games.find((game) => game.id === "game_magic")?.activeEventCount).toBe(2);
    expect(games.find((game) => game.id === "game_chess")?.activeEventCount).toBe(0);
    expect(queries.filter((query) => /^select\b/i.test(query.trim()))).toHaveLength(1);
  });
});
