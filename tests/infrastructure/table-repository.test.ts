import Sqlite from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import * as schema from "../../src/infrastructure/db/schema";
import { initializeDatabase } from "../../src/infrastructure/db/initialize";
import { DrizzleTableRepository } from "../../src/infrastructure/db/repositories/table-repository";

describe("DrizzleTableRepository", () => {
  let sqlite: Sqlite.Database; let repository: DrizzleTableRepository; let queries: string[];
  beforeEach(() => { queries = []; sqlite = new Sqlite(":memory:", { verbose: (query) => queries.push(String(query)) }); sqlite.pragma("foreign_keys = ON"); initializeDatabase(sqlite); repository = new DrizzleTableRepository(drizzle(sqlite, { schema })); });
  afterEach(() => sqlite.close());

  it("tracks seating, moving, and release sessions", async () => {
    await repository.create("org_mana_vault", "Alpha", 2); await repository.create("org_mana_vault", "Bravo", 2);
    let tables = await repository.listForOrganization("org_mana_vault");
    await repository.seat({ organizationId: "org_mana_vault", tableId: tables[0].id, guestName: "Guest 1" });
    tables = await repository.listForOrganization("org_mana_vault"); const seat = tables[0].occupants[0];
    expect(tables[0].occupiedSince).not.toBeNull();
    await repository.move("org_mana_vault", seat.id, tables[1].id);
    tables = await repository.listForOrganization("org_mana_vault");
    expect(tables[0].occupants).toHaveLength(0); expect(tables[0].occupiedSince).toBeNull(); expect(tables[1].occupants[0].name).toBe("Guest 1");
    await repository.releaseTable("org_mana_vault", tables[1].id);
    expect((await repository.listForOrganization("org_mana_vault"))[1].occupiedSince).toBeNull();
  });

  it("enforces capacity and safe capacity edits", async () => {
    await expect(repository.create("org_mana_vault", "", 4)).rejects.toThrow("name");
    await expect(repository.create("org_mana_vault", "Alpha", 21)).rejects.toThrow("between 1 and 20");
    await repository.create("org_mana_vault", "Alpha", 1); const table = (await repository.listForOrganization("org_mana_vault"))[0];
    await repository.seat({ organizationId: "org_mana_vault", tableId: table.id, guestName: "Guest 1" });
    await expect(repository.seat({ organizationId: "org_mana_vault", tableId: table.id, guestName: "Guest 2" })).rejects.toThrow("capacity");
    await expect(repository.update("org_mana_vault", table.id, "Alpha", 0)).rejects.toThrow();
    await expect(repository.delete("org_mana_vault", table.id)).rejects.toThrow("Release");
  });

  it("permanently deletes an available table", async () => {
    await repository.create("org_mana_vault", "Alpha", 4); const table = (await repository.listForOrganization("org_mana_vault"))[0];
    await repository.delete("org_mana_vault", table.id);
    expect(await repository.listForOrganization("org_mana_vault")).toHaveLength(0);
  });

  it("loads every table and occupant with a bounded query count", async () => {
    for (let index = 1; index <= 8; index += 1) await repository.create("org_mana_vault", `Table ${index}`, 4);
    const tables = await repository.listForOrganization("org_mana_vault");
    for (const table of tables) await repository.seat({ organizationId: "org_mana_vault", tableId: table.id, guestName: "Guest 1" });
    queries = [];
    const loaded = await repository.listForOrganization("org_mana_vault");
    expect(loaded).toHaveLength(8);
    expect(loaded.every((table) => table.occupants.length === 1)).toBe(true);
    expect(queries.filter((query) => /^select\b/i.test(query.trim()))).toHaveLength(3);
  });
});
