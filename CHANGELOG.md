# Changelog

All notable changes to GameHall are documented here.

## [0.2.0] - 2026-07-16

This release turns the desktop conversion into a production-oriented local application. It replaces
the old aggregate league table with a real competition history, hardens local persistence and the
Electron runtime, and makes installer output deterministic.

### Added

- A persistent league competition model for participants, rounds, matches, match entries, and
  auditable stat adjustments.
- Match play, single and double round robin, Swiss, Swiss with Top Cut, single and double elimination,
  Elo ladder, multiplayer pods/free-for-all, cumulative points, campaign, and open-play formats.
- Generated round-robin schedules, Swiss pairings with rematch avoidance, seeded elimination brackets,
  automatic byes, winner advancement, lower-bracket recovery, and reset finals.
- Calculated standings with games played, wins, losses, draws, byes, points, opponent-win percentage,
  ladder rating, withdrawal/elimination state, and champion state.
- Match correction and voiding, reasoned point adjustments, participant enrollment/withdrawal, CSV
  standings export, and Discord notices for league creation, enrollment, and winners.
- An Archived Events page with ten items per page, selected/all permanent deletion, and a clearly
  documented 100-event retention limit.
- A paginated Backups settings page with download, upload, restore, selected deletion, and delete-all actions.
- A database-backed desktop health check, rotating local process logs, and bounded renderer recovery.
- Automated tests for league rules, identifiers, repositories, backups, request security, Electron
  process helpers, health checks, and desktop packaging.

### Changed

- Event deletion now archives the event and sends the user directly to Archived Events. Archived and
  past events are read-only; automatic maintenance retains the newest 100.
- Pending-payment registrations now reserve event capacity, preventing the last seat from being sold twice.
- Daily backup work is owned by the desktop maintenance scheduler. One automatic snapshot is kept per
  UTC day for seven days, with stale-lock recovery and single-flight execution.
- Restore now stages uploads, verifies the SQLite header and integrity, checks the core schema and
  relationships, migrates the staged copy, preserves the current database, and imports transactionally.
- Entity IDs now use full random UUIDs with domain prefixes instead of shortened identifiers that could collide.
- Event, game, table, and dashboard list reads use bounded aggregate queries instead of per-row SQLite queries.
- Client mutations share a timeout-aware request helper and always release their busy state after a
  failed, aborted, or stalled request.
- The desktop shell chooses a dynamic loopback port, waits for real readiness, retries startup races,
  monitors the bundled server, and shuts it down cleanly.
- The package version is now `0.2.0`; the root and Electron manifests remain synchronized.

### Fixed

- League formats now enforce their documented lifecycle, participant minimums, late-enrollment rules,
  draw restrictions, score consistency, round progression, and completion conditions.
- League standings now derive from the match and adjustment history instead of mutating one aggregate row.
- Event archive navigation, past-event pagination, and selected/all deletion now behave consistently.
- Automatic backups no longer depend on a one-time module import and recover from abandoned lock files.
- Restoring an older compatible backup now creates and migrates the new league tables before import.
- Form controls no longer remain permanently disabled after a request failure, which could make fields
  appear unresponsive until the application was restarted.
- The installer no longer embeds a previous installer or stale build output.
- The packaged server now receives the matching Node.js runtime and native SQLite dependency it needs
  instead of relying on software installed on the user's computer.
- Child-process exits, failed health checks, port races, renderer crashes, and unresponsive windows now
  have explicit recovery or actionable failure handling.
- The release workflow now uses current action runtimes, rejects a tag that does not match the package
  version, and refuses to mutate an already-published release.

### Security

- The packaged server binds to `127.0.0.1` only and accepts requests only for its exact assigned host.
- Every launch creates a high-entropy desktop session token stored in an HttpOnly, same-site cookie.
- State-changing requests require the expected same-origin metadata; scheduled jobs use a separate
  high-entropy bearer token.
- The Electron renderer is sandboxed, has Node integration disabled, denies permissions and popups,
  and blocks navigation or redirects away from the application origin.
- Stored Discord webhook URLs are revalidated before every delivery, requests have a timeout, and
  non-successful Discord responses are reported instead of being treated as delivered.
- Content Security Policy and other response headers are set for the local application.
- The runtime dependency audit reports no known vulnerabilities at release preparation time.

### Removed

- Login, account, team, role, invitation, tenant-selection, and public event-page code from the former
  hosted-product direction.
- The unused email gateway, templates, provider adapter, and related runtime dependencies.
- The obsolete aggregate league-standing entity and persistence path.
- Archived/restore table controls that did not fit the live table-management workflow.
- Stale generated installer directories and redundant package contents from source control and release output.

## [0.1.3] - 2026-07-15

### Added

- The first installable GameHall Windows desktop build with local SQLite storage and no login requirement.
- Table occupancy, bulk table creation, player and guest seating, moves, releases, and occupied-time tracking.
- Player, game, event, basic league, settings, theme, Discord webhook, backup, and calendar interfaces.
- GameHall branding, application icons, green/light/dark themes, and a Windows installer workflow.

### Changed

- Reoriented the project from a hosted multi-user product to a private, local-first game-night manager.
- Moved installer downloads to immutable GitHub Releases instead of committing generated binaries.
