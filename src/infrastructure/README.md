# Infrastructure

Concrete adapters used by the application:

- `db`: embedded SQLite initialization, Drizzle schema, and repositories
- `email`: optional Resend or console email gateways
- `discord`: optional webhook or console gateways

The database creates itself on first launch. Domain and application modules depend on interfaces,
not these concrete adapters.
