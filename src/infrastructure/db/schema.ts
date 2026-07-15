import { sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

const timestamp = (name: string) => integer(name, { mode: "timestamp" });
const boolean = (name: string) => integer(name, { mode: "boolean" });
const now = sql`(unixepoch())`;

export const organizations = sqliteTable("organizations", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  publicSlug: text("public_slug").notNull().unique(),
  type: text("type", {
    enum: ["game_store", "club", "convention_team", "community_group"],
  }).notNull().default("community_group"),
  timezone: text("timezone").notNull(),
  contactEmail: text("contact_email").notNull().default(""),
  defaultVenueName: text("default_venue_name").notNull().default(""),
  publicPageEnabled: boolean("public_page_enabled").notNull().default(true),
  waitlistsEnabledByDefault: boolean("waitlists_enabled_by_default").notNull().default(true),
  discordWebhookUrl: text("discord_webhook_url"),
  status: text("status", { enum: ["active", "archived"] }).notNull().default("active"),
});

export const memberProfiles = sqliteTable("member_profiles", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  userId: text("user_id"),
  displayName: text("display_name").notNull(),
  email: text("email"),
  phone: text("phone"),
  favoriteGameSystem: text("favorite_game_system").notNull().default("Unspecified"),
  status: text("status", { enum: ["active", "blocked", "archived"] }).notNull().default("active"),
  joinedAt: timestamp("joined_at").notNull().default(now),
});

export const gameTables = sqliteTable("game_tables", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  capacity: integer("capacity").notNull().default(4),
  status: text("status", { enum: ["active", "archived"] }).notNull().default("active"),
  createdAt: timestamp("created_at").notNull().default(now),
});

export const tableSessions = sqliteTable("table_sessions", {
  id: text("id").primaryKey(),
  tableId: text("table_id")
    .notNull()
    .references(() => gameTables.id, { onDelete: "cascade" }),
  startedAt: timestamp("started_at").notNull().default(now),
  endedAt: timestamp("ended_at"),
});

export const tableSeats = sqliteTable("table_seats", {
  id: text("id").primaryKey(),
  sessionId: text("session_id")
    .notNull()
    .references(() => tableSessions.id, { onDelete: "cascade" }),
  memberProfileId: text("member_profile_id").references(() => memberProfiles.id, {
    onDelete: "set null",
  }),
  guestName: text("guest_name"),
  seatedAt: timestamp("seated_at").notNull().default(now),
  releasedAt: timestamp("released_at"),
});

export const gameSystems = sqliteTable("game_systems", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  type: text("type", {
    enum: ["tcg", "ttrpg", "miniatures", "board_game", "other"],
  }).notNull(),
  defaultCapacity: integer("default_capacity").notNull().default(8),
  notes: text("notes").notNull().default(""),
  status: text("status", { enum: ["active", "archived"] }).notNull().default("active"),
});

export const events = sqliteTable("events", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  status: text("status", {
    enum: ["draft", "published", "cancelled", "completed"],
  }).notNull().default("draft"),
  visibility: text("visibility", { enum: ["public", "unlisted", "private"] })
    .notNull()
    .default("public"),
  startsAt: timestamp("starts_at").notNull(),
  endsAt: timestamp("ends_at").notNull(),
  capacity: integer("capacity").notNull(),
  waitlistEnabled: boolean("waitlist_enabled").notNull().default(true),
  entryFeeInCents: integer("entry_fee_in_cents").notNull().default(0),
  gameSystemId: text("game_system_id").references(() => gameSystems.id, {
    onDelete: "set null",
  }),
  gameSystemLabel: text("game_system_label").notNull().default("Other"),
  venueId: text("venue_id"),
  venueName: text("venue_name").notNull().default(""),
  roomId: text("room_id"),
  roomName: text("room_name"),
  createdAt: timestamp("created_at").notNull().default(now),
});

export const registrations = sqliteTable("registrations", {
  id: text("id").primaryKey(),
  eventId: text("event_id")
    .notNull()
    .references(() => events.id, { onDelete: "cascade" }),
  memberProfileId: text("member_profile_id")
    .notNull()
    .references(() => memberProfiles.id, { onDelete: "cascade" }),
  status: text("status", {
    enum: ["pending_payment", "confirmed", "cancelled", "checked_in"],
  }).notNull(),
  registeredAt: timestamp("registered_at").notNull().default(now),
  checkedInAt: timestamp("checked_in_at"),
});

export const payments = sqliteTable("payments", {
  id: text("id").primaryKey(),
  registrationId: text("registration_id")
    .notNull()
    .references(() => registrations.id, { onDelete: "cascade" }),
  amountInCents: integer("amount_in_cents").notNull(),
  provider: text("provider", { enum: ["manual"] }).notNull(),
  status: text("status", {
    enum: ["requires_payment", "paid", "failed", "refunded"],
  }).notNull(),
  providerReference: text("provider_reference"),
  recordedAt: timestamp("recorded_at").notNull().default(now),
});

export const announcements = sqliteTable("announcements", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  eventId: text("event_id").references(() => events.id, { onDelete: "set null" }),
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  audience: text("audience", {
    enum: ["confirmed_attendees", "waitlisted", "all_attendees", "organization_members"],
  }).notNull(),
  status: text("status", { enum: ["draft", "scheduled", "sent", "failed"] })
    .notNull()
    .default("draft"),
  recipientCount: integer("recipient_count").notNull().default(0),
  sentAt: timestamp("sent_at"),
  scheduledFor: timestamp("scheduled_for"),
  notifyDiscord: boolean("notify_discord").notNull().default(false),
  createdAt: timestamp("created_at").notNull().default(now),
});

export const waitlistEntries = sqliteTable("waitlist_entries", {
  id: text("id").primaryKey(),
  eventId: text("event_id")
    .notNull()
    .references(() => events.id, { onDelete: "cascade" }),
  memberProfileId: text("member_profile_id")
    .notNull()
    .references(() => memberProfiles.id, { onDelete: "cascade" }),
  position: integer("position").notNull(),
  status: text("status", { enum: ["waiting", "promoted", "withdrawn"] })
    .notNull()
    .default("waiting"),
  joinedAt: timestamp("joined_at").notNull().default(now),
});

export const leagues = sqliteTable("leagues", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  gameSystemId: text("game_system_id").references(() => gameSystems.id, {
    onDelete: "set null",
  }),
  gameSystemLabel: text("game_system_label").notNull().default("Other"),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  format: text("format", { enum: ["match_play", "round_robin", "double_round_robin", "swiss", "swiss_top_cut", "single_elimination", "double_elimination", "ladder", "free_for_all", "points_series", "campaign", "open_play"] }).notNull().default("match_play"),
  status: text("status", { enum: ["draft", "active", "completed", "archived"] })
    .notNull()
    .default("draft"),
  startsAt: timestamp("starts_at"),
  endsAt: timestamp("ends_at"),
  createdAt: timestamp("created_at").notNull().default(now),
});

export const leagueStandings = sqliteTable("league_standings", {
  id: text("id").primaryKey(),
  leagueId: text("league_id")
    .notNull()
    .references(() => leagues.id, { onDelete: "cascade" }),
  memberProfileId: text("member_profile_id")
    .notNull()
    .references(() => memberProfiles.id, { onDelete: "cascade" }),
  wins: integer("wins").notNull().default(0),
  losses: integer("losses").notNull().default(0),
  draws: integer("draws").notNull().default(0),
  bonusPoints: integer("bonus_points").notNull().default(0),
});
