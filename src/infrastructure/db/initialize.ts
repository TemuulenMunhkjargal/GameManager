import type Sqlite from "better-sqlite3";

const schemaSql = `
CREATE TABLE IF NOT EXISTS organizations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  public_slug TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL DEFAULT 'community_group',
  timezone TEXT NOT NULL,
  contact_email TEXT NOT NULL DEFAULT '',
  default_venue_name TEXT NOT NULL DEFAULT '',
  public_page_enabled INTEGER NOT NULL DEFAULT 1,
  waitlists_enabled_by_default INTEGER NOT NULL DEFAULT 1,
  discord_webhook_url TEXT,
  status TEXT NOT NULL DEFAULT 'active'
);

CREATE TABLE IF NOT EXISTS member_profiles (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id TEXT,
  display_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  favorite_game_system TEXT NOT NULL DEFAULT 'Unspecified',
  status TEXT NOT NULL DEFAULT 'active',
  joined_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS game_tables (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  capacity INTEGER NOT NULL DEFAULT 4,
  status TEXT NOT NULL DEFAULT 'active',
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS table_sessions (
  id TEXT PRIMARY KEY,
  table_id TEXT NOT NULL REFERENCES game_tables(id) ON DELETE CASCADE,
  started_at INTEGER NOT NULL DEFAULT (unixepoch()),
  ended_at INTEGER
);

CREATE TABLE IF NOT EXISTS table_seats (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES table_sessions(id) ON DELETE CASCADE,
  member_profile_id TEXT REFERENCES member_profiles(id) ON DELETE SET NULL,
  guest_name TEXT,
  seated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  released_at INTEGER
);

CREATE TABLE IF NOT EXISTS game_systems (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  type TEXT NOT NULL,
  default_capacity INTEGER NOT NULL DEFAULT 8,
  notes TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active'
);

CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft',
  visibility TEXT NOT NULL DEFAULT 'public',
  starts_at INTEGER NOT NULL,
  ends_at INTEGER NOT NULL,
  capacity INTEGER NOT NULL,
  waitlist_enabled INTEGER NOT NULL DEFAULT 1,
  entry_fee_in_cents INTEGER NOT NULL DEFAULT 0,
  game_system_id TEXT REFERENCES game_systems(id) ON DELETE SET NULL,
  game_system_label TEXT NOT NULL DEFAULT 'Other',
  venue_id TEXT,
  venue_name TEXT NOT NULL DEFAULT '',
  room_id TEXT,
  room_name TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS registrations (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  member_profile_id TEXT NOT NULL REFERENCES member_profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  registered_at INTEGER NOT NULL DEFAULT (unixepoch()),
  checked_in_at INTEGER
);

CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  registration_id TEXT NOT NULL REFERENCES registrations(id) ON DELETE CASCADE,
  amount_in_cents INTEGER NOT NULL,
  provider TEXT NOT NULL,
  status TEXT NOT NULL,
  provider_reference TEXT,
  recorded_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS announcements (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  event_id TEXT REFERENCES events(id) ON DELETE SET NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  audience TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  recipient_count INTEGER NOT NULL DEFAULT 0,
  sent_at INTEGER,
  scheduled_for INTEGER,
  notify_discord INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS waitlist_entries (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  member_profile_id TEXT NOT NULL REFERENCES member_profiles(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'waiting',
  joined_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS leagues (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  game_system_id TEXT REFERENCES game_systems(id) ON DELETE SET NULL,
  game_system_label TEXT NOT NULL DEFAULT 'Other',
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  format TEXT NOT NULL DEFAULT 'match_play',
  status TEXT NOT NULL DEFAULT 'draft',
  starts_at INTEGER,
  ends_at INTEGER,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS league_standings (
  id TEXT PRIMARY KEY,
  league_id TEXT NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  member_profile_id TEXT NOT NULL REFERENCES member_profiles(id) ON DELETE CASCADE,
  wins INTEGER NOT NULL DEFAULT 0,
  losses INTEGER NOT NULL DEFAULT 0,
  draws INTEGER NOT NULL DEFAULT 0,
  bonus_points INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS events_organization_idx ON events(organization_id);
CREATE INDEX IF NOT EXISTS registrations_event_idx ON registrations(event_id);
CREATE INDEX IF NOT EXISTS members_organization_idx ON member_profiles(organization_id);
CREATE INDEX IF NOT EXISTS waitlist_event_idx ON waitlist_entries(event_id);
CREATE INDEX IF NOT EXISTS game_tables_organization_idx ON game_tables(organization_id);
CREATE INDEX IF NOT EXISTS table_sessions_table_idx ON table_sessions(table_id, ended_at);
CREATE INDEX IF NOT EXISTS table_seats_session_idx ON table_seats(session_id, released_at);
`;

export const LATEST_SCHEMA_VERSION = 2;

const migrations: { version: number; migrate: (sqlite: Sqlite.Database) => void }[] = [
  {
    version: 1,
    // Version 1 is the local-first baseline represented by schemaSql. Existing
    // databases are adopted after the idempotent baseline tables are ensured.
    migrate: () => undefined,
  },
  {
    version: 2,
    migrate: (sqlite) => {
      const leagueColumns = sqlite.pragma("table_info(leagues)") as { name: string }[];
      if (!leagueColumns.some((column) => column.name === "format")) {
        sqlite.exec("ALTER TABLE leagues ADD COLUMN format TEXT NOT NULL DEFAULT 'match_play'");
      }
      const standingColumns = sqlite.pragma("table_info(league_standings)") as { name: string }[];
      if (!standingColumns.some((column) => column.name === "bonus_points")) {
        sqlite.exec("ALTER TABLE league_standings ADD COLUMN bonus_points INTEGER NOT NULL DEFAULT 0");
      }
    },
  },
];

export function initializeDatabase(sqlite: Sqlite.Database): void {
  sqlite.exec(schemaSql);

  const currentVersion = sqlite.pragma("user_version", { simple: true }) as number;
  for (const migration of migrations.filter((item) => item.version > currentVersion)) {
    sqlite.transaction(() => {
      migration.migrate(sqlite);
      sqlite.pragma(`user_version = ${migration.version}`);
    })();
  }

  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  sqlite
    .prepare(
      `INSERT OR IGNORE INTO organizations (
        id, name, public_slug, type, timezone, contact_email, default_venue_name
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      "org_mana_vault",
      "My Game Nights",
      "my-game-nights",
      "community_group",
      timezone,
      "",
      "",
    );
}
