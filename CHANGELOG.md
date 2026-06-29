# Changelog

All notable changes made to CritTable since the initial scaffold commit.

## [Unreleased]

### Fixed — architecture layering violations

The initial scaffold had domain entities and a couple of use cases, but every API route and every server-component page bypassed them entirely and read/wrote through a single file, `src/lib/crit-table-store.ts`. This violated the documented layering (`docs/architecture.md`), which states route handlers must "call one use case" and must not "import database tables directly."

- Removed `src/lib/crit-table-store.ts`.
- Added missing application-layer use cases: `CreateEventUseCase`, `CheckInRegistrationUseCase`, `RegisterGuestForEventUseCase` (finds-or-creates a `MemberProfile` for guest RSVPs, then delegates to `RegisterForEventUseCase`).
- Added application-layer **ports** (interfaces) for every repository/query the app needs: `EventRepository`/`EventQueries`, `MemberRepository`/`MemberQueries`, `RegistrationRepository`/`RegistrationQueries`, `GameSystemQueries`, `OrganizationSettingsQueries`, `DashboardQueries`.
- Added `src/infrastructure/container.ts` as the single composition root. Routes and pages now import `container`, never a concrete infrastructure class.
- Rewrote every `src/app/api/**/route.ts` handler to: parse input → resolve context → call one use case → return a response. No business logic in route handlers.
- Rewrote every server-component page (`/dashboard`, `/dashboard/events`, `/dashboard/members`, `/dashboard/games`, `/dashboard/settings`, public `/events/[id]`) to call `container.*` queries instead of the old store.
- Extended the `Event` domain entity with `description`, `gameSystemLabel`, `venueName`, `roomName` — legitimate business attributes, not a layering workaround (full `Venue`/`GameSystem` aggregates are still future work).

### Added — waitlist domain model

- New `WaitlistEntry` domain entity (`src/domain/registrations/waitlist-entry.ts`) with `waiting` → `promoted`/`withdrawn` states, instead of faking it as a `Registration` status.
- `RegisterForEventUseCase` now actually waitlists when an event is full and `waitlistEnabled` is true (assigns queue position), instead of failing.
- New `CancelRegistrationUseCase` — cancelling a confirmed registration automatically promotes the next waiting entry into a real confirmed (or `pending_payment`, for paid events) registration.
- New `WithdrawFromWaitlistUseCase` for leaving the queue voluntarily.
- Dashboard event-detail page shows `waitlist #N` badges and cancel/leave-waitlist actions.
- Public RSVP form tells the registrant their queue position when waitlisted.

### Added — PostgreSQL persistence via Drizzle ORM

Previously all data lived in an in-memory array that reset on every process restart.

- `src/infrastructure/db/schema.ts` — Drizzle schema for `organizations`, `member_profiles`, `game_systems`, `events`, `registrations`, `waitlist_entries`, with real foreign keys.
- `src/infrastructure/db/client.ts` — singleton Drizzle/`postgres` client.
- `src/infrastructure/db/repositories/*` — `DrizzleEventRepository`, `DrizzleRegistrationRepository`, `DrizzleWaitlistRepository`, `DrizzleMemberRepository`, and the read-only query adapters, all implementing the exact same application-layer ports the in-memory versions did (no changes needed above the repository layer).
- `docker-compose.yml` — local Postgres 16 container.
- `drizzle.config.ts` + `src/infrastructure/db/migrations/` — schema migrations.
- `src/infrastructure/db/seed.ts` — wipes and reseeds demo data (one organization, two events, three members).
- New npm scripts: `db:up`, `db:down`, `db:generate`, `db:migrate`, `db:seed`, `db:studio`.
- Fixed a latent bug: dashboard pages were being statically prerendered at **build time**, baking in whatever was in the DB during `npm run build` and never updating after deploy. Added `export const dynamic = "force-dynamic"` to every DB-backed page.
- Fixed a follow-up env-loading bug: `dotenv` was being imported by `client.ts`, which is shared by both the Next.js app (which already auto-loads `.env.local`) and standalone CLI scripts (which don't). This pulled a CLI-only dependency into the app bundle and broke `next build`/`next dev`. Moved the `dotenv` loading into a small `load-env.ts` side-effect module imported only by `seed.ts` (and `drizzle.config.ts`, which already had its own copy).

### Added — authentication and authorization (Better Auth)

- `src/infrastructure/auth/auth.ts` — Better Auth configuration (email/password), backed by the same Postgres database via its Drizzle adapter.
- `user`, `session`, `account`, `verification` tables added to the schema (aliased exports so Better Auth's adapter can find them by its expected names) plus a new `memberships` table tying a Better Auth user to an organization role (`owner`/`admin`/`event_manager`/`staff`/`viewer`).
- `src/infrastructure/auth/current-user-provider.ts` — adapts Better Auth's session API to a new `CurrentUserProvider` application port, so use cases never import the auth library directly.
- New `MembershipRepository` port + `DrizzleMembershipRepository` implementation, and a `resolveActor(organizationId)` helper in the composition root that resolves "who is making this request" for route handlers.
- New `requireEventManagement()` authorization guard (`src/application/shared/authorization.ts`), used by `CreateEventUseCase`, `CheckInRegistrationUseCase`, and `CancelRegistrationUseCase` — these now reject the action with a `Result` failure if the caller doesn't have an active `owner`/`admin`/`event_manager` membership. The existing `Membership.canManageEvents()` domain rule (previously unused) is now actually enforced.
- `/api/events` (POST), `/check-in`, and `/cancel` routes resolve the current session and membership, returning `401` if unauthenticated and `403` if authenticated but unauthorized.
- `/dashboard` layout now resolves the current session server-side and redirects to `/sign-in` if there isn't one — checked on every request, not just hidden in the UI. Public event pages and RSVP remain intentionally unauthenticated.
- New `/sign-in` page and a sign-out button in the dashboard header.
- `npm run db:seed` now also creates a demo staff account (`owner@manavault.example` / `crittable-demo`) with an `owner` membership.
- Added `.npmrc` (`legacy-peer-deps=true`) to resolve a peer-dependency conflict introduced by `better-auth`.

### Verified (not just typechecked)

- Built a local Postgres 16 instance and ran the actual end-to-end flows against it: create event → register → duplicate-registration block → capacity-full waitlist → cancel → auto-promotion → check-in, all enforced by the domain entities.
- Killed and restarted the Next.js process mid-test and confirmed via direct SQL queries that events/registrations/waitlist entries persisted in Postgres independently of the app process.
- Signed in via the real Better Auth API, confirmed session-gated dashboard access (307 redirect when signed out, 200 when signed in), and confirmed `401`/`403`/success responses on the protected routes match the authorization rules.

### Known gaps / explicitly not done

- No Stripe integration yet (paid entry still just records an entry fee; no real payment intent).
- No Resend (email) or Discord integration.
- No UI for inviting teammates or changing roles — `memberships` rows are managed directly in the database or via `db:seed`.
- No email verification or password reset flow.
- "Add member" / "Add game system" / "Save settings" buttons in the dashboard are still inert.
