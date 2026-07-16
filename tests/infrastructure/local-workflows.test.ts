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
import { Event } from "../../src/domain/events/event";
import { MemberProfile } from "../../src/domain/members/member-profile";
import { DrizzleLeagueRepository } from "../../src/infrastructure/db/repositories/league-repository";
import { AwardLeaguePointsUseCase, EnrollLeagueParticipantUseCase, RecordLeagueMatchUseCase, StartLeagueUseCase } from "../../src/application/leagues/create-league";
import { League } from "../../src/domain/leagues/league";

describe("local-first workflows", () => {
  let sqlite: Sqlite.Database;
  beforeEach(() => { sqlite = new Sqlite(":memory:"); sqlite.pragma("foreign_keys = ON"); initializeDatabase(sqlite); });
  afterEach(() => sqlite.close());

  it("persists a player's favorite game", async () => {
    const members = new DrizzleMemberRepository(drizzle(sqlite, { schema }));
    const result = await new CreateMemberProfileUseCase(members, () => "member_1").execute({ organizationId: "org_mana_vault", displayName: "Alex", email: null, phone: null, favoriteGameSystem: "Chess" });
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
    let sequence = 0;
    const db = drizzle(sqlite, { schema }); const members = new DrizzleMemberRepository(db); const leagues = new DrizzleLeagueRepository(db, (prefix) => `${prefix}_${++sequence}`);
    await members.save(new MemberProfile("member_1", "org_mana_vault", null, "Alex", null, null, "Chess", "active"));
    await members.save(new MemberProfile("member_2", "org_mana_vault", null, "Blair", null, null, "Chess", "active"));
    await leagues.save(new League("league_1", "org_mana_vault", null, "Chess", "League", "", "round_robin", "draft", null, null));
    const enroll = new EnrollLeagueParticipantUseCase(leagues, leagues, members, () => `participant_${++sequence}`);
    await enroll.execute({ organizationId: "org_mana_vault", leagueId: "league_1", memberProfileId: "member_1" });
    await enroll.execute({ organizationId: "org_mana_vault", leagueId: "league_1", memberProfileId: "member_2" });
    await new StartLeagueUseCase(leagues, leagues).execute({ organizationId: "org_mana_vault", leagueId: "league_1" });
    const match = (await leagues.getDetail("league_1", "org_mana_vault"))!.rounds[0].matches[0];
    const alex = match.entries.find((entry) => entry.memberName === "Alex")!;
    const result = await new RecordLeagueMatchUseCase(leagues, leagues).execute({ organizationId: "org_mana_vault", leagueId: "league_1", matchId: match.id, winnerParticipantId: alex.participantId, draw: false });
    expect(result.ok).toBe(true);
    const standings = (await leagues.getDetail("league_1", "org_mana_vault"))!.standings;
    expect(standings.map((standing) => ({ name: standing.memberName, wins: standing.wins, losses: standing.losses }))).toEqual([
      { name: "Alex", wins: 1, losses: 0 }, { name: "Blair", wins: 0, losses: 1 },
    ]);
  });

  it("awards auditable points for a points series", async () => {
    const db = drizzle(sqlite, { schema }); const members = new DrizzleMemberRepository(db); const leagues = new DrizzleLeagueRepository(db, (prefix) => `${prefix}_1`);
    await members.save(new MemberProfile("member_1", "org_mana_vault", null, "Alex", null, null, "Commander", "active"));
    await leagues.save(new League("league_1", "org_mana_vault", null, "Warhammer", "Escalation Series", "", "points_series", "active", null, null));
    await leagues.addParticipant({ id: "participant_1", leagueId: "league_1", memberProfileId: "member_1", seed: 1 });
    const result = await new AwardLeaguePointsUseCase(leagues, leagues, () => "adjustment_1").execute({ organizationId: "org_mana_vault", leagueId: "league_1", participantId: "participant_1", points: 5, reason: "Pod victory" });
    expect(result.ok).toBe(true);
    expect((await leagues.getDetail("league_1", "org_mana_vault"))!.standings[0]).toMatchObject({ memberName: "Alex", points: 5 });
  });

  it("migrates legacy league data to the format-aware schema", () => {
    const legacy = new Sqlite(":memory:");
    legacy.exec(`
      CREATE TABLE organizations (id TEXT PRIMARY KEY, name TEXT NOT NULL, public_slug TEXT NOT NULL UNIQUE, type TEXT NOT NULL, timezone TEXT NOT NULL, contact_email TEXT NOT NULL DEFAULT '', default_venue_name TEXT NOT NULL DEFAULT '', public_page_enabled INTEGER NOT NULL DEFAULT 1, waitlists_enabled_by_default INTEGER NOT NULL DEFAULT 1, discord_webhook_url TEXT, status TEXT NOT NULL DEFAULT 'active');
      CREATE TABLE member_profiles (id TEXT PRIMARY KEY, organization_id TEXT NOT NULL, user_id TEXT, display_name TEXT NOT NULL, email TEXT, phone TEXT, favorite_game_system TEXT NOT NULL DEFAULT 'Unspecified', status TEXT NOT NULL DEFAULT 'active', joined_at INTEGER NOT NULL DEFAULT (unixepoch()));
      CREATE TABLE leagues (id TEXT PRIMARY KEY, organization_id TEXT NOT NULL, game_system_id TEXT, game_system_label TEXT NOT NULL DEFAULT 'Other', name TEXT NOT NULL, description TEXT NOT NULL DEFAULT '', format TEXT NOT NULL DEFAULT 'match_play', status TEXT NOT NULL DEFAULT 'draft', starts_at INTEGER, ends_at INTEGER, created_at INTEGER NOT NULL DEFAULT (unixepoch()));
      CREATE TABLE league_standings (id TEXT PRIMARY KEY, league_id TEXT NOT NULL, member_profile_id TEXT NOT NULL, wins INTEGER NOT NULL DEFAULT 0, losses INTEGER NOT NULL DEFAULT 0, draws INTEGER NOT NULL DEFAULT 0, bonus_points INTEGER NOT NULL DEFAULT 0);
      INSERT INTO organizations (id, name, public_slug, type, timezone) VALUES ('org_mana_vault', 'GameHall', 'gamehall', 'community_group', 'UTC');
      INSERT INTO member_profiles (id, organization_id, display_name) VALUES ('member_legacy', 'org_mana_vault', 'Legacy Player');
      INSERT INTO leagues (id, organization_id, game_system_label, name, format, status) VALUES ('league_legacy', 'org_mana_vault', 'Chess', 'Legacy League', 'match_play', 'completed');
      INSERT INTO league_standings (id, league_id, member_profile_id, wins, losses, draws, bonus_points) VALUES ('standing_legacy', 'league_legacy', 'member_legacy', 3, 1, 0, 2);
      PRAGMA user_version = 2;
    `);
    initializeDatabase(legacy);
    expect(legacy.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'league_standings'").get()).toBeUndefined();
    expect(legacy.prepare("SELECT member_profile_id, seed FROM league_participants").get()).toEqual({ member_profile_id: "member_legacy", seed: 1 });
    expect(legacy.prepare("SELECT wins, losses, draws, points FROM league_stat_adjustments").get()).toEqual({ wins: 3, losses: 1, draws: 0, points: 11 });
    const migrated = new DrizzleLeagueRepository(drizzle(legacy, { schema }), (prefix) => `${prefix}_new`);
    return migrated.getDetail("league_legacy", "org_mana_vault").then((detail) => {
      expect(detail?.standings[0]).toMatchObject({ memberName: "Legacy Player", wins: 3, losses: 1, points: 11 });
      legacy.close();
    });
  });
});
