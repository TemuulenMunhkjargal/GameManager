import Sqlite from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { EventDetailDTO, EventQueries, EventSummaryDTO } from "../../src/application/events/ports";
import { initializeDatabase } from "../../src/infrastructure/db/initialize";
import { DrizzleDashboardQueries } from "../../src/infrastructure/db/repositories/dashboard-queries";
import * as schema from "../../src/infrastructure/db/schema";

function summary(
  id: string,
  endsAt: string,
  status: EventSummaryDTO["status"] = "published",
): EventSummaryDTO {
  return {
    id,
    title: id,
    gameSystemLabel: "Chess",
    gameSystemId: null,
    venueName: "",
    startsAt: "2099-01-01T18:00:00.000Z",
    endsAt,
    capacity: 8,
    confirmedCount: 3,
    waitlistCount: 0,
    entryFeeInCents: 500,
    status,
    visibility: "private",
    waitlistEnabled: true,
    archivedAt: null,
  };
}

describe("DrizzleDashboardQueries", () => {
  let sqlite: Sqlite.Database;

  beforeEach(() => {
    sqlite = new Sqlite(":memory:");
    sqlite.pragma("foreign_keys = ON");
    initializeDatabase(sqlite);
  });

  afterEach(() => sqlite.close());

  it("returns reusable upcoming event rows and counts only active players", async () => {
    sqlite.prepare("INSERT INTO member_profiles (id, organization_id, display_name, status) VALUES (?, ?, ?, ?)")
      .run("member_active", "org_mana_vault", "Active", "active");
    sqlite.prepare("INSERT INTO member_profiles (id, organization_id, display_name, status) VALUES (?, ?, ?, ?)")
      .run("member_archived", "org_mana_vault", "Archived", "archived");

    const eventRows = [
      summary("upcoming", "2099-01-01T21:00:00.000Z"),
      summary("cancelled", "2099-01-02T21:00:00.000Z", "cancelled"),
      summary("past", "2000-01-01T21:00:00.000Z", "completed"),
    ];
    const events: EventQueries = {
      listForOrganization: async () => eventRows,
      getDetail: async () => null as EventDetailDTO | null,
    };
    const queries = new DrizzleDashboardQueries(drizzle(sqlite, { schema }), events);

    const result = await queries.getSummary("org_mana_vault");

    expect(result.upcomingEvents.map((event) => event.id)).toEqual(["upcoming"]);
    expect(result.activeMemberCount).toBe(1);
    expect(result.revenueInCents).toBe(1_500);
  });
});
