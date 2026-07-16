# Infrastructure

Concrete adapters used by the application:

- `db`: embedded SQLite initialization, Drizzle schema, and repositories
- `discord`: optional webhook delivery for event and league announcements

The database creates and migrates itself on first launch. Pre-migration and daily safety backups are
kept beside it. Domain and application modules depend on interfaces, not these concrete adapters.
