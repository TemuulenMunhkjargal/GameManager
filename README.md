# CritTable

CritTable is a desktop-first event operations platform for local game stores and nerdy hobby communities.

The first product slice focuses on:

- Store or club organizations
- Public event pages
- RSVP, waitlists, and check-in
- Members and staff roles
- Paid event entry
- Event announcements and reminders
- Future Discord, Stripe, and email integrations

## Initial Stack

- Frontend and backend: Next.js, React, TypeScript
- API: Next.js Route Handlers and server-side use cases
- Database: PostgreSQL
- ORM: Drizzle ORM
- UI: Tailwind CSS and shadcn/ui
- Auth: Clerk or Better Auth
- Email: Resend
- Payments: Stripe
- Hosting: Vercel

## Architecture Docs

- [Architecture Overview](docs/architecture.md)
- [Domain Model and Class Diagram](docs/domain-model.md)
- [Module Boundaries](docs/modules.md)

## Local Development

1. **Start Postgres** (Docker required):

   ```bash
   npm run db:up        # docker compose up -d
   ```

2. **Configure your environment**:

   ```bash
   cp .env.example .env.local
   ```

   Then generate a real auth secret and put it in `.env.local`:

   ```bash
   openssl rand -hex 32
   ```

   (On Windows without OpenSSL, any random 32+ byte hex string works — e.g. generate one at https://generate-secret.vercel.app/32.)

3. **Install dependencies**:

   ```bash
   npm install
   ```

4. **Run migrations and seed demo data**:

   ```bash
   npm run db:migrate
   npm run db:seed
   ```

   This creates a demo organization, two events, three members, and one staff account you can sign in with:

   | | |
   |---|---|
   | Email | `owner@manavault.example` |
   | Password | `crittable-demo` |

5. **Run the app**:

   ```bash
   npm run dev          # http://localhost:3000
   ```

   Visit `/sign-in` and log in with the staff account above to reach `/dashboard`. Public event pages (`/events/[id]`) and RSVP don't require an account — only staff actions (creating events, checking people in, cancelling registrations) do.

### Other useful scripts

| Script | What it does |
| --- | --- |
| `npm run db:up` / `npm run db:down` | Start/stop the local Postgres container |
| `npm run db:generate` | Generate a new migration after editing `src/infrastructure/db/schema.ts` |
| `npm run db:migrate` | Apply pending migrations |
| `npm run db:seed` | Wipe and reseed demo data, including the staff login above |
| `npm run db:studio` | Open Drizzle Studio, a GUI for browsing your local database |
| `npm run typecheck` | Type-check without emitting |

### Architecture in practice

The codebase follows the layering in `docs/architecture.md` strictly:

- `src/domain/` — entities and business rules, no framework or vendor imports.
- `src/application/` — use cases (`CreateEventUseCase`, `RegisterForEventUseCase`, `CancelRegistrationUseCase`, etc.) and the **ports** (interfaces) they depend on, including `CurrentUserProvider` and `MembershipRepository` for authorization.
- `src/infrastructure/db/` — the only place that knows about Postgres/Drizzle. Repository classes here implement the application-layer ports.
- `src/infrastructure/auth/` — Better Auth configuration (`auth.ts`) and the `CurrentUserProvider` adapter built on top of it. Use cases never import Better Auth directly — they depend on the `CurrentUserProvider`/`Membership` ports instead.
- `src/infrastructure/container.ts` — the composition root. Routes and server components import `container` (and `resolveActor`) from here; they never import a concrete infrastructure class directly.
- `src/app/api/**/route.ts` — thin route handlers: resolve the current user, call one use case, return a response.

To swap in a different persistence technology or auth provider later, write a new set of adapter classes implementing the same ports and change only `container.ts`.

### Scheduled announcements

Staff can schedule an event announcement for a future time instead of sending immediately. Actually sending it requires something to call `POST /api/cron/send-announcements` periodically — this app doesn't run its own scheduler. Options:

- **Vercel Cron** (if deploying there): add a `vercel.json` with a cron entry pointing at that path, roughly every 5 minutes.
- **Any other host**: a system cron job or external uptime-style pinger hitting that URL works fine.
- Set `CRON_SECRET` in your environment and send it as `Authorization: Bearer <CRON_SECRET>` — without it, the endpoint is open (fine for local dev, not for production).

Locally, you can just call it yourself to test: `curl -X POST http://localhost:3000/api/cron/send-announcements`.

### Payments

Will be done in-store, no third party involvement.

### Roles and permissions

`Membership.role` is one of `owner`, `admin`, `event_manager`, `staff`, `viewer`. `Membership.canManageEvents()` (in `src/domain/organizations/membership.ts`) decides who can create events, check attendees in, and cancel registrations — `owner`, `admin`, and `event_manager` can; `staff` and `viewer` currently cannot. There's no admin UI yet for inviting teammates or changing roles; for now, insert rows into the `memberships` table directly (or extend `db:seed`).


