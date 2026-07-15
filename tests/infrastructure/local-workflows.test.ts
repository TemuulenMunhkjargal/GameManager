import Sqlite from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import * as schema from "../../src/infrastructure/db/schema";
import { initializeDatabase, LATEST_SCHEMA_VERSION } from "../../src/infrastructure/db/initialize";
import { DrizzleMemberRepository } from "../../src/infrastructure/db/repositories/member-repository";
import { DrizzleEventRepository } from "../../src/infrastructure/db/repositories/event-repository";
import { DrizzleRegistrationRepository } from "../../src/infrastructure/db/repositories/registration-repository";
import { DrizzleWaitlistRepository } from "../../src/infrastructure/db/repositories/waitlist-repository";
import { CreateMemberProfileUseCase } from "../../src/application/members/create-member-profile";
import { RegisterForEventUseCase } from "../../src/application/registrations/register-for-event";
import { Membership } from "../../src/domain/organizations/membership";
import { Event } from "../../src/domain/events/event";
import { MemberProfile } from "../../src/domain/members/member-profile";
import { DrizzleLeagueRepository } from "../../src/infrastructure/db/repositories/league-repository";
import { AwardLeaguePointsUseCase, RecordLeagueResultUseCase } from "../../src/application/leagues/create-league";
import { League } from "../../src/domain/leagues/league";

describe("local-first workflows", () => {
  let sqlite: Sqlite.Database;
  beforeEach(() => { sqlite = new Sqlite(":memory:"); sqlite.pragma("foreign_keys = ON"); initializeDatabase(sqlite); });
  afterEach(() => sqlite.close());

  it("persists a player's favorite game", async () => {
    const members = new DrizzleMemberRepository(drizzle(sqlite, { schema }));
    const owner = new Membership("membership", "org_mana_vault", "local", "owner", "active");
    const result = await new CreateMemberProfileUseCase(members, () => "member_1").execute({ organizationId: "org_mana_vault", actorMembership: owner, displayName: "Alex", email: null, phone: null, favoriteGameSystem: "Chess" });
    expect(result.ok).toBe(true);
    expect((await members.listForOrganization("org_mana_vault"))[0].favoriteGameSystem).toBe("Chess");
  });

  it("registers an existing local player for a published event", async () => {
    const db = drizzle(sqlite, { schema });
    const members = new DrizzleMemberRepository(db); const events = new DrizzleEventRepository(db);
    await members.save(new MemberProfile("member_1", "org_mana_vault", null, "Alex", null, null, "Chess", "active"));
    await events.save(new Event("event_1", "org_mana_vault", "Chess night", "", "published", "private", new Date("2030-01-01T18:00:00Z"), new Date("2030-01-01T21:00:00Z"), 4, 0, true, null, null, "Chess", null, "Local game night", null, null));
    const registrations = new DrizzleRegistrationRepository(db);
    const result = await new RegisterForEventUseCase(events, members, registrations, new DrizzleWaitlistRepository(db), () => "reg_1", () => "wait_1").execute({ organizationId: "org_mana_vault", eventId: "event_1", memberProfileId: "member_1" });
    expect(result).toEqual({ ok: true, value: { kind: "confirmed", id: "reg_1" } });
    expect(await registrations.listForEvent("event_1")).toHaveLength(1);
  });

  it("records the current schema version", () => {
    expect(sqlite.pragma("user_version", { simple: true })).toBe(LATEST_SCHEMA_VERSION);
  });

  it("records complementary league results for both players", async () => {
    const db = drizzle(sqlite, { schema }); const members = new DrizzleMemberRepository(db); const leagues = new DrizzleLeagueRepository(db);
    await members.save(new MemberProfile("member_1", "org_mana_vault", null, "Alex", null, null, "Chess", "active"));
    await members.save(new MemberProfile("member_2", "org_mana_vault", null, "Blair", null, null, "Chess", "active"));
    await leagues.save(new League("league_1", "org_mana_vault", null, "Chess", "League", "", "swiss", "active", null, null));
    const owner = new Membership("membership", "org_mana_vault", "local", "owner", "active");
    const result = await new RecordLeagueResultUseCase(leagues, leagues, members, () => `standing_${crypto.randomUUID()}`).execute({ organizationId: "org_mana_vault", actorMembership: owner, leagueId: "league_1", memberProfileId: "member_1", opponentProfileId: "member_2", result: "win" });
    expect(result.ok).toBe(true);
    const standings = (await leagues.getDetail("league_1", "org_mana_vault"))!.standings;
    expect(standings.map((standing) => ({ name: standing.memberName, wins: standing.wins, losses: standing.losses }))).toEqual([
      { name: "Alex", wins: 1, losses: 0 }, { name: "Blair", wins: 0, losses: 1 },
    ]);
  });

  it("awards points for a free-for-all league", async () => {
    const db = drizzle(sqlite, { schema }); const members = new DrizzleMemberRepository(db); const leagues = new DrizzleLeagueRepository(db);
    await members.save(new MemberProfile("member_1", "org_mana_vault", null, "Alex", null, null, "Commander", "active"));
    await leagues.save(new League("league_1", "org_mana_vault", null, "Commander", "Pod League", "", "free_for_all", "active", null, null));
    const owner = new Membership("membership", "org_mana_vault", "local", "owner", "active");
    const result = await new AwardLeaguePointsUseCase(leagues, leagues, members, () => "standing_1").execute({ organizationId: "org_mana_vault", actorMembership: owner, leagueId: "league_1", memberProfileId: "member_1", points: 5 });
    expect(result.ok).toBe(true);
    expect((await leagues.getDetail("league_1", "org_mana_vault"))!.standings[0]).toMatchObject({ memberName: "Alex", bonusPoints: 5, points: 5 });
  });

  it("migrates legacy league data to the format-aware schema", () => {
    const legacy = new Sqlite(":memory:");
    legacy.exec("CREATE TABLE leagues (id TEXT PRIMARY KEY); CREATE TABLE league_standings (id TEXT PRIMARY KEY); PRAGMA user_version = 1;");
    initializeDatabase(legacy);
    const leagueColumns = legacy.pragma("table_info(leagues)") as { name: string }[];
    const standingColumns = legacy.pragma("table_info(league_standings)") as { name: string }[];
    expect(leagueColumns.map((column) => column.name)).toContain("format");
    expect(standingColumns.map((column) => column.name)).toContain("bonus_points");
    legacy.close();
  });
});
