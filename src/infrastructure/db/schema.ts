import {
  boolean,
  integer,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

/**
 * Drizzle schema. This is the only file that should know what the tables
 * actually look like in Postgres — application/domain code never imports
 * from here directly, only the repository classes in
 * `src/infrastructure/db/repositories/*` do.
 */

/**
 * Better Auth's required tables. These are managed by the auth library
 * itself (see src/infrastructure/auth/auth.ts) — application/domain code
 * never queries them directly. Domain code only ever sees a `UserId`
 * (== authUsers.id) and a Membership row, both via the application ports.
 */
export const authUsers = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const authSessions = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => authUsers.id, { onDelete: "cascade" }),
});

export const authAccounts = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => authUsers.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const authVerifications = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// Better Auth's Drizzle adapter matches tables by these exact export names
// when you pass the whole schema module to it (see src/infrastructure/auth/auth.ts).
export const user = authUsers;
export const session = authSessions;
export const account = authAccounts;
export const verification = authVerifications;

/**
 * Domain table: a user's role inside an organization. References Better
 * Auth's `user` table for identity, but the role/permission logic lives
 * entirely in the Membership domain entity, not in the auth library.
 */
export const memberships = pgTable("memberships", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => authUsers.id, { onDelete: "cascade" }),
  role: text("role", {
    enum: ["owner", "admin", "event_manager", "staff", "viewer"],
  }).notNull(),
  status: text("status", { enum: ["active", "invited", "suspended"] })
    .notNull()
    .default("active"),
});

export const organizations = pgTable("organizations", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  publicSlug: text("public_slug").notNull().unique(),
  timezone: text("timezone").notNull(),
  contactEmail: text("contact_email").notNull(),
  defaultVenueName: text("default_venue_name").notNull(),
  publicPageEnabled: boolean("public_page_enabled").notNull().default(true),
  waitlistsEnabledByDefault: boolean("waitlists_enabled_by_default").notNull().default(true),
});

export const memberProfiles = pgTable("member_profiles", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  userId: text("user_id"),
  displayName: text("display_name").notNull(),
  email: text("email"),
  phone: text("phone"),
  favoriteGameSystem: text("favorite_game_system").notNull().default("Unspecified"),
  status: text("status", { enum: ["active", "blocked", "archived"] })
    .notNull()
    .default("active"),
  joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
});

export const gameSystems = pgTable("game_systems", {
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
});

export const events = pgTable("events", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  status: text("status", {
    enum: ["draft", "published", "cancelled", "completed"],
  })
    .notNull()
    .default("draft"),
  visibility: text("visibility", { enum: ["public", "unlisted", "private"] })
    .notNull()
    .default("public"),
  startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
  endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
  capacity: integer("capacity").notNull(),
  waitlistEnabled: boolean("waitlist_enabled").notNull().default(true),
  entryFeeInCents: integer("entry_fee_in_cents").notNull().default(0),
  gameSystemId: text("game_system_id").references(() => gameSystems.id, { onDelete: "set null" }),
  gameSystemLabel: text("game_system_label").notNull().default("Other"),
  venueId: text("venue_id"),
  venueName: text("venue_name").notNull().default("Store"),
  roomId: text("room_id"),
  roomName: text("room_name"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const registrations = pgTable("registrations", {
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
  registeredAt: timestamp("registered_at", { withTimezone: true }).notNull().defaultNow(),
  checkedInAt: timestamp("checked_in_at", { withTimezone: true }),
});

export const waitlistEntries = pgTable("waitlist_entries", {
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
  joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
});
