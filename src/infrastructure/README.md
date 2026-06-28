# Infrastructure

This folder will hold concrete adapters for external tools and persistence.

Planned adapters:

- `db`: PostgreSQL and Drizzle schema/repositories
- `auth`: Clerk or Better Auth session adapters
- `email`: Resend email gateway
- `payments`: Stripe payment gateway
- `discord`: Discord webhook/bot adapter

Domain and application code should depend on interfaces, not these concrete implementations.

