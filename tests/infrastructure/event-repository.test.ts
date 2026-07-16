import Sqlite from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { Event } from "../../src/domain/events/event";
import { initializeDatabase } from "../../src/infrastructure/db/initialize";
import * as schema from "../../src/infrastructure/db/schema";
import { DrizzleEventRepository } from "../../src/infrastructure/db/repositories/event-repository";

function event(id: string, organizationId = "org_mana_vault", archivedAt: Date | null = null): Event {
  return new Event(
    id,
    organizationId,
    `Event ${id}`,
    "",
    "draft",
    "private",
    new Date("2030-01-01T18:00:00.000Z"),
    new Date("2030-01-01T21:00:00.000Z"),
    8,
    0,
    true,
    null,
    null,
    "Chess",
    null,
    "Local",
    null,
    null,
    archivedAt,
  );
}

describe("DrizzleEventRepository archive operations", () => {
  let sqlite: Sqlite.Database;
  let repository: DrizzleEventRepository;
  let queries: string[];

  beforeEach(() => {
    queries = [];
    sqlite = new Sqlite(":memory:", { verbose: (query) => queries.push(String(query)) });
    sqlite.pragma("foreign_keys = ON");
    initializeDatabase(sqlite);
    repository = new DrizzleEventRepository(drizzle(sqlite, { schema }));
  });

  afterEach(() => sqlite.close());

  it("round-trips the manual archive timestamp", async () => {
    const archivedAt = new Date("2029-01-01T00:00:00.000Z");
    await repository.save(event("event_archived", "org_mana_vault", archivedAt));

    expect(await repository.getDetail("event_archived", "org_mana_vault"))
      .toMatchObject({ id: "event_archived", archivedAt: archivedAt.toISOString() });
  });

  it("adds the archive column when opening a version 2 database", () => {
    sqlite.exec("ALTER TABLE events DROP COLUMN archived_at; PRAGMA user_version = 2;");

    initializeDatabase(sqlite);

    const columns = sqlite.pragma("table_info(events)") as { name: string }[];
    expect(columns.map((column) => column.name)).toContain("archived_at");
  });

  it("permanently deletes a selected set within one organization only", async () => {
    sqlite.prepare("INSERT INTO organizations (id, name, public_slug, timezone) VALUES (?, ?, ?, ?)")
      .run("org_other", "Other", "other", "UTC");
    await repository.save(event("event_one"));
    await repository.save(event("event_two"));
    await repository.save(event("event_other", "org_other"));

    const removed = await repository.deleteMany(["event_one", "event_one", "event_other"], "org_mana_vault");

    expect(removed).toBe(1);
    expect(await repository.findByIdForOrganization("event_one", "org_mana_vault")).toBeNull();
    expect(await repository.findByIdForOrganization("event_two", "org_mana_vault")).not.toBeNull();
    expect(await repository.findByIdForOrganization("event_other", "org_other")).not.toBeNull();
  });

  it("loads event and reservation counts with a bounded number of queries", async () => {
    const insertRegistration = sqlite.prepare(
      "INSERT INTO registrations (id, event_id, member_profile_id, status) VALUES (?, ?, ?, ?)",
    );
    for (let index = 0; index < 8; index += 1) {
      const eventId = `event_${index}`;
      const memberId = `member_${index}`;
      await repository.save(event(eventId));
      sqlite.prepare("INSERT INTO member_profiles (id, organization_id, display_name) VALUES (?, ?, ?)")
        .run(memberId, "org_mana_vault", `Player ${index}`);
      insertRegistration.run(`registration_${index}`, eventId, memberId, index === 0 ? "pending_payment" : "confirmed");
    }

    queries = [];
    const summaries = await repository.listForOrganization("org_mana_vault");

    expect(summaries).toHaveLength(8);
    expect(summaries.find((item) => item.id === "event_0")?.confirmedCount).toBe(1);
    expect(queries.filter((query) => /^select\b/i.test(query.trim()))).toHaveLength(3);
  });
});
