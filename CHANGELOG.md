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

### Added — transactional emails (Resend)

- New `EmailGateway` application-layer port (`src/application/shared/email-gateway.ts`) defining five send methods. Use cases call this interface; no Resend import exists anywhere outside the infrastructure layer.
- `ResendEmailGateway` (`src/infrastructure/email/resend-gateway.ts`) — implements the port using the Resend SDK. Errors are caught and logged rather than thrown, so an email failure never breaks the primary action that triggered it.
- `ConsoleEmailGateway` (`src/infrastructure/email/console-gateway.ts`) — logs email payloads to the console. Used automatically in development when `RESEND_API_KEY` is not set — no fake API key needed.
- Five HTML email templates (`src/infrastructure/email/templates.ts`) — clean, responsive, work in any client.
- **Team invite** — sent when an owner/admin invites a teammate, with the organization name and sign-up URL.
- **RSVP confirmation** — sent to the guest after a successful public registration. Includes event details and, for paid events, a note to pay at the door.
- **Waitlist confirmation** — sent when someone is placed on the waitlist, showing their position number.
- **Waitlist promotion** — sent automatically to the next person in the queue when a confirmed registration is cancelled.
- **Payment confirmation** — sent when staff marks a registration as paid via "Mark paid" in the dashboard.
- `.env.example` updated with `RESEND_API_KEY` and `RESEND_FROM` (both commented out — the app works without them in dev).



- `Membership` domain entity extended with `canManageTeam()` (owners and admins only), `accept(userId)` (pending invite → active), `changeRole(newRole)`, and `suspend()` transitions. `userId` is now nullable so invitations can be stored before the invitee has created an account.
- New use cases: `InviteTeammateUseCase`, `AcceptPendingInvitationsUseCase`, `UpdateTeammateRoleUseCase`, `RemoveTeammateUseCase`. All carry authorization guards — only `owner`/`admin` memberships can manage the team. Owner-removal and last-owner invariants enforced in the domain layer.
- `MembershipRepository` port extended with `findById`, `findByEmail`, `findInvitesByEmail`, and `countActiveOwners`. `DrizzleMembershipRepository` updated accordingly.
- New `DrizzleTeamQueries` read model — joins memberships with auth users, shows `"Pending invite"` / `invitedEmail` for memberships not yet claimed.
- Better Auth `databaseHooks.user.create.after` — when someone signs up, any pending invitations for that email are automatically claimed and linked to the new account (implemented via `AcceptPendingInvitationsUseCase`).
- Schema migration: `memberships.user_id` is now nullable; new `invited_email` column added.
- Three new API routes: `POST /api/team/invite`, `POST /api/team/[membershipId]/role`, `POST /api/team/[membershipId]/remove`.
- New `/dashboard/team` page showing the full roster (name, email, role badge, status badge), a role-change select that saves on change, a remove/revoke button, and an invite form — all conditional on `canManageTeam()` so staff/viewers see the roster but can't edit it.
- New `/sign-up` page so invitees can create an account and claim their invitation. Link added to the sign-in page.



No Stripe integration yet — paid events are settled in person (cash or card-at-door) and staff record it afterward, while still going through a real domain transition rather than just flipping a status flag.

- `Payment` domain entity fleshed out with `markPaid()`, `markFailed()`, `refund()` transitions (previously just a placeholder with an `isSettled` getter).
- `Registration.confirmPayment()` — a new domain transition from `pending_payment` to `confirmed`.
- New `payments` table + `DrizzlePaymentRepository` implementing a new `PaymentRepository` port.
- New `RecordManualPaymentUseCase` — staff-only (goes through `requireEventManagement()` like the other staff actions), looks up or creates a `Payment` row with `provider: "manual"`, marks it paid, and confirms the registration in one transaction-shaped use case.
- New `POST /api/events/[eventId]/registrations/[registrationId]/mark-paid` route.
- Dashboard event-detail page shows a "Mark paid" button on `pending_payment` registrations, and now allows cancelling registrations that are still awaiting payment (not just confirmed/waitlisted ones).
- Public RSVP form now tells the guest to pay at the door when they've registered for a paid event, instead of implying their seat is already confirmed.

Known limitation: a `pending_payment` registration doesn't count toward `Event.confirmedCount` (and therefore doesn't occupy a guaranteed seat) until staff mark it paid, so multiple people could register for the last seat before any of them pay. A production version would need a temporary hold with an expiry. Not built here — flagging it rather than quietly leaving it.

### Added — editable organization settings and game system catalog

Previously the Settings and Game Systems pages were read-only displays with inert "Save changes" / "Add system" buttons.

- `Organization` domain entity extended with `updateProfile()` and `archive()` transitions (matching the methods already named in `docs/domain-model.md`), plus the contact email, default venue, and public-page/waitlist-default fields that were previously only in the read DTO.
- `GameSystem` domain entity extended with a `create()` factory (validates name and capacity, auto-generates a slug) and the `organizationId`/`defaultCapacity`/`notes` fields.
- New `OrganizationRepository` and `GameSystemRepository` (write-side) ports, plus `UpdateOrganizationProfileUseCase` and `CreateGameSystemUseCase`. Both require `canManageTeam()` (organization settings) or `canManageEvents()` (game system catalog) respectively — same authorization pattern as the rest of the app.
- `organizations` table gained `type` and `status` columns to match the domain entity (migration `0004_hard_gorgon`).
- New routes: `POST /api/organization/settings`, `GET`/`POST /api/game-systems`.
- Settings page is now a real form (client component) that saves via the API and shows success/error state. Gated to `owner`/`admin` — staff/viewer see a read-only notice instead.
- Games page has an inline "Add system" form (owner/admin/event_manager only) and no longer divides by zero when the catalog is empty.

### Added — reinstate a suspended team member

- `Membership.reinstate()` domain transition (`suspended` → `active`); rejects reinstating a membership that was never linked to a real account (a revoked invite, not a removed staff member).
- New `ReinstateTeammateUseCase`, gated by `canManageTeam()` like the rest of team management.
- `TeamMemberDTO` gained a `hasAccount` field so the UI can tell a "revoked invite" (no reinstate option, re-invite instead) apart from a "removed staff member" (reinstate option shown).
- New `POST /api/team/[membershipId]/reinstate` route.
- Team page shows a "Reinstate" button for suspended members who have a linked account.

### Verified (not just typechecked)


- Built a local Postgres 16 instance and ran the actual end-to-end flows against it: create event → register → duplicate-registration block → capacity-full waitlist → cancel → auto-promotion → check-in, all enforced by the domain entities.
- Killed and restarted the Next.js process mid-test and confirmed via direct SQL queries that events/registrations/waitlist entries persisted in Postgres independently of the app process.
- Signed in via the real Better Auth API, confirmed session-gated dashboard access (307 redirect when signed out, 200 when signed in), and confirmed `401`/`403`/success responses on the protected routes match the authorization rules.
- Created a paid event, registered a guest (landed in `pending_payment`), confirmed `mark-paid` is rejected without a session, confirmed it succeeds with a staff session and writes a real `payments` row, confirmed a second `mark-paid` attempt is rejected by the domain entity, and confirmed the now-`confirmed` registration can be checked in — verified the `payments` row via direct SQL query, independent of the app process (which was restarted mid-test).
- Added a game system and updated organization settings via the real API with and without a session (401 unauthenticated, success authenticated), then confirmed both writes via direct SQL query against Postgres.
- Invited and claimed a teammate, suspended (removed) them, confirmed reinstate is rejected without a session, confirmed it succeeds with a session and flips status back to active, confirmed reinstating an already-active membership is rejected by the domain entity, and confirmed the "Reinstate" button actually renders in the team page HTML for a suspended member.

### Known gaps / explicitly not done

- No Stripe (or any online payment) integration — entry fees are settled manually at the door.
- Pending overbooking edge case with manual payments: a `pending_payment` seat doesn't hold capacity until paid.
- No email verification or password reset flow in Better Auth yet.
- No Discord integration.

### Added — email verification and password reset

- `auth.ts` extended with `emailAndPassword.sendResetPassword` and `emailVerification.sendVerificationEmail` hooks — both delegate to the existing `EmailGateway` port (Resend in production, console in dev). Better Auth handles token generation, expiry (1 hour), and single-use enforcement.
- `EmailGateway` port gained `sendEmailVerification()` and `sendPasswordReset()` methods. Both adapters (`ResendEmailGateway`, `ConsoleEmailGateway`) implement them.
- New email templates: verification email (clean HTML with a "Verify email" CTA) and password reset email ("Reset password" CTA with tampering disclaimer).
- Extracted email gateway selection into `src/infrastructure/email/gateway-selection.ts` — shared by `container.ts` and `auth.ts` so neither duplicates the "Resend or console?" logic.
- `/forgot-password` — form submits to Better Auth's `/api/auth/request-password-reset`; shows a neutral "check your inbox" message regardless of whether the email exists (prevents user enumeration).
- `/reset-password` — reads `?token=` from the URL (Better Auth's callback sets it), submits to `/api/auth/reset-password`, then redirects to `/sign-in` after 1.5 s.
- Sign-in page now has a "Forgot password?" link and a "Have an invite? Create an account" link to `/sign-up`.

Verified live: signed up a user (verification email logged to console), followed the verification URL with a GET request → `302` redirect with a real session cookie, `email_verified` flipped to `t` in Postgres. Requested a password reset → token in logged email, followed the reset flow → old password rejected with `401`, new password accepted with `200`, reusing the token returns `{"code":"INVALID_TOKEN"}`.

### Added — Discord integration (webhooks + OAuth)

**Discord webhook announcements:**
- New `DiscordGateway` application-layer port (`src/application/shared/discord-gateway.ts`) with a `sendEventAnnouncement()` method. Follows the same port/adapter pattern as `EmailGateway`.
- `WebhookDiscordGateway` adapter (`src/infrastructure/discord/webhook-gateway.ts`) — POSTs a rich Discord embed (title, game system, venue, date, capacity, entry fee, public URL, store name) to any Discord channel webhook. Errors are caught and logged, never re-thrown.
- `ConsoleDiscordGateway` adapter — logs the payload for local dev when no webhook is configured.
- `CreateEventUseCase` now looks up the organization's `discordWebhookUrl` after saving the event and fires the announcement if one is set. Fire-and-forget, same as emails.
- `Organization` domain entity, `OrganizationSettingsDTO`, and `UpdateOrganizationProfileCommand` all gained `discordWebhookUrl: string | null`.
- Settings UI now has a Discord webhook URL input field with a link to Discord's "How to create a webhook" docs.
- Migration `0005_sleepy_guardsmen`: `ALTER TABLE organizations ADD COLUMN discord_webhook_url text`.

**Discord OAuth sign-in:**
- Better Auth `socialProviders.discord` configured — enabled only when both `DISCORD_CLIENT_ID` and `DISCORD_CLIENT_SECRET` env vars are set, so the app works normally without them.
- "Sign in with Discord" button (with the Discord logo mark SVG) rendered on both the sign-in and sign-up pages, above the email/password form with a divider. Clicking it redirects to Discord's OAuth flow and lands back on `/dashboard`.
- `.env.example` updated with `DISCORD_CLIENT_ID`/`DISCORD_CLIENT_SECRET` (commented out), redirect URI instructions.

Verified live: saved a webhook URL via the settings API, created an event — `WebhookDiscordGateway` fired and hit the Discord API URL (blocked by sandbox egress policy, but the request was made and the error was caught without breaking event creation). Confirmed `discord_webhook_url` persisted in Postgres. Discord sign-in button renders in the sign-in page HTML.

### Added — event lifecycle, announcements, member creation

- `Event.publish()` / `Event.cancel()` domain transitions wired up: events can now be created as drafts (invisible publicly, no registrations accepted) and published later, or cancelled outright. `canRegister()` already guarded on `status === "published"` — this was previously unreachable dead code since every event was force-created as `published`.
- New `Announcement` domain entity (`draft` → `sent`/`failed`) and `SendEventAnnouncementUseCase` — emails a chosen audience (confirmed attendees / confirmed+waitlisted / waitlist only) and optionally cross-posts to Discord. Named directly in `docs/architecture.md` as an application-layer example.
- New `CreateMemberProfileUseCase` — the "Add member" button on the Members page is no longer inert; creates a `MemberProfile` directly (not tied to a registration), rejecting duplicate emails within the org.
- Event detail page: draft/cancelled status banners, Publish/Cancel buttons (gated by `canManageEvents()`), a "Send announcement" panel with audience selector and Discord cross-post checkbox, and a log of previously sent announcements.
- New `announcements` table (migration `0006_smooth_lionheart`).
- Create-event form now supports "Save as draft" vs. "Publish now".

### Added — Venues, Rooms, and Leagues

Two domain concepts named in `docs/domain-model.md` that had no implementation at all.

- New `Venue` and `Room` domain entities (`src/domain/organizations/`) — a venue belongs to an organization, a room belongs to a venue, with capacity and active/archived status.
- New `League` and `LeagueStanding` domain entities (`src/domain/leagues/`) — leagues have a `draft → active → completed/archived` lifecycle; standings track wins/losses/draws per member with a computed `points` getter (3/1/0 scoring).
- Full port/use-case/repository stack for both: `CreateVenueUseCase`, `CreateRoomUseCase`, `CreateLeagueUseCase`, `StartLeagueUseCase`, `RecordLeagueResultUseCase` — all gated by `canManageEvents()`. `RecordLeagueResultUseCase` rejects results for any league that isn't `active`.
- New `venues`, `rooms`, `leagues`, `league_standings` tables (migration `0007_abandoned_luminals`).
- New dashboard pages: `/dashboard/venues` (add venues, expand to add/view rooms) and `/dashboard/leagues` (create leagues, start them, record results, live standings table sorted by points).
- The create-event form's venue/room text inputs now suggest real venues/rooms via a `<datalist>` fed from `/api/venues` — kept as free text rather than a hard foreign key for now, so event creation doesn't regress if no venues exist yet.

Verified live: created a draft event, confirmed registration was rejected while in draft, published it, confirmed registration then succeeded, sent an announcement (email logged, row persisted), cancelled the event and confirmed re-publishing was rejected by the domain entity. Created a venue with a room via the real API. Created a league, confirmed recording a result before starting was rejected, started it, recorded a win and a draw for the same member, confirmed points accumulated correctly (4) on the same standing row rather than creating duplicates.


### Added — event editing and payment refunds

- `Event.updateDetails()` domain transition — lets staff edit title, description, game system, venue/room, schedule, capacity, entry fee, and waitlist setting after creation. Enforces two invariants: capacity can't be dropped below the event's current confirmed-registration count, and cancelled/completed events can't be edited at all.
- New `UpdateEventUseCase` and `PUT /api/events/[eventId]` route, gated by `canManageEvents()` like event creation.
- New `/dashboard/events/[eventId]/edit` page — pre-filled form reusing the same venue/room datalist suggestions as event creation. Linked from an "Edit" button on the event detail page (hidden once an event is cancelled or completed).
- `Membership.canManageBilling()` — previously a domain method with zero call sites — is now actually enforced via a new `requireBillingManagement()` guard. Refunds require `owner`/`admin`; regular `event_manager`/`staff` can still collect payment via "Mark paid" but cannot reverse it. Verified live: an invited `event_manager` was correctly blocked from refunding (`403`) while still being able to edit the same event.
- New `RefundPaymentUseCase`, calling the existing (previously unused) `Payment.refund()` transition, plus a refund confirmation email template and a `sendRefundConfirmation()` method on the `EmailGateway` port (implemented by both the Resend and console adapters).
- New `POST /api/events/[eventId]/registrations/[registrationId]/refund` route and a `RefundButton` on the event detail page — shows a two-step confirm before firing, only visible to owner/admin, only for registrations with a `paid` payment. A `refunded` badge now appears next to any registration whose payment was reversed.
- `RegistrationSummaryDTO` gained a `paymentStatus` field (via a new left join in the Drizzle registration repository) so the UI can tell paid, unpaid, and refunded registrations apart without a separate query.

Verified live: created a paid 2-seat event, registered and paid two guests, confirmed editing capacity down to 1 was rejected ("can't be set below the 2 confirmed registrations"), confirmed a valid edit (title/description/room/capacity increase) succeeded and reflected immediately in both the API and the rendered dashboard page, confirmed unauthenticated edits are rejected. Refunded one registration — confirmed `401` unauthenticated, success as owner, the domain entity itself rejecting a second refund attempt, the `payments` row flipping to `refunded` in Postgres, and the refund confirmation email firing with the correct amount.


### Added — venue/room FK linkage, CSV exports, scheduled announcements

**Venues and rooms are now real foreign keys on events, not just free text.** Previously `CreateEventUseCase` stored `venueName`/`roomName` as plain strings — two events at "the same" venue had no provable relationship. Now:
- `CreateEventUseCase` and `UpdateEventUseCase` accept optional `venueId`/`roomId`; when provided, the use case looks up the real `Venue`/`Room` row and uses its actual name (ignoring whatever string was passed alongside), rejecting the request if the ID doesn't resolve.
- `EventDetailDTO` exposes `venueId`/`roomId` so the edit form can pre-select the right dropdown option.
- The create/edit event forms now show a real `<select>` of your venues (with rooms nested underneath), falling back to free-text entry via an explicit "Other (type manually)" option — so event creation never breaks if you haven't set up a venue catalog yet.

**CSV export** for the three places you'd actually want a spreadsheet:
- `GET /api/events/[eventId]/attendees.csv` — name, email, status, payment status, waitlist position, timestamps.
- `GET /api/members.csv` — the full member directory.
- `GET /api/leagues/[leagueId]/standings.csv` — player, W/L/D, points.
- A small `toCsv()` helper (`src/lib/csv.ts`) handles RFC 4180 escaping (quotes, commas, newlines) and uses CRLF line endings for clean Excel compatibility. All three routes are gated by `canManageEvents()`.

**Scheduled announcements** — `Announcement.schedule()` was named in the architecture docs but had no supporting infrastructure.
- `Announcement` domain entity gained a `scheduled` status, a `scheduledFor` timestamp, and a `notifyDiscord` flag (needed so a *later* scheduled send still knows whether Discord posting was requested at creation time).
- Extracted the actual "email + optionally Discord" delivery logic out of `SendEventAnnouncementUseCase` into a shared `AnnouncementDeliveryService`, so both an immediate send and a future scheduled send go through identical code.
- New `SendDueAnnouncementsUseCase` — finds every `scheduled` announcement whose time has passed and delivers it, marking it `sent` or `failed`.
- New `POST /api/cron/send-announcements` (also responds to `GET`, since some providers — including Vercel Cron — call via GET) — intended to be hit every few minutes by an external scheduler. Protected by a `CRON_SECRET` bearer token when set; open (dev-friendly) when not set.
- Announcement form on the event detail page now has a "Send now" / "Schedule for later" toggle with a datetime picker; the domain entity itself rejects scheduling anything in the past.
- Migration `0008_melodic_microbe`: `announcements.scheduled_for`, `announcements.notify_discord`.

Verified live: created a venue+room via the real API, created an event referencing them by ID, and confirmed the event record shows the venue's actual name (not the placeholder string sent alongside the ID) — and that a bogus venue ID is rejected. Exported attendees/members CSVs with and without auth. Scheduled an announcement 1 hour out (confirmed it sits as `scheduled`, not sent), attempted scheduling in the past (rejected by the domain entity), scheduled a second one 2 seconds out, waited, and hit the cron endpoint — confirmed it sent exactly the due one (real email delivered, `sent_at` populated) while leaving the still-future one untouched. Verified the `CRON_SECRET` gate rejects missing/wrong tokens and accepts the correct one (after tracking down a red herring: an earlier stale server process was serving pre-change code, which I addressed by force-killing all Next.js processes and confirming the port was free before restarting — worth knowing if bounces ever seem to ignore new env vars or code changes on your own machine, since `next start` doesn't hot-reload).


### Added — bulk check-in, archive/restore for venues and game systems, dead dependency cleanup

**Bulk check-in.** The event detail page's attendee list is now a client component (`AttendeeList`) with per-row checkboxes on confirmed registrations, a "select all confirmed" toggle, and a "Check in N selected" bar. New `BulkCheckInUseCase` processes each registration individually and returns a per-registration outcome (`checkedIn: [...]`, `failed: [{ registrationId, reason }]`) rather than succeeding or failing as an all-or-nothing block — one bad ID in a batch doesn't stop the rest from being checked in. New `POST /api/events/[eventId]/bulk-check-in` route.

**Archive/restore for venues and game systems.** `Venue.archive()` existed but had no `restore()` and no UI; `GameSystem` had no status concept at all.
- `GameSystem` domain entity gained a `status` field plus `archive()`/`restore()` transitions (mirroring `Venue`, which gained `restore()` to match its existing `archive()`).
- `game_systems` table gained a `status` column (migration `0009_thin_shiver_man`).
- New `ArchiveVenueUseCase`/`RestoreVenueUseCase` and `ArchiveGameSystemUseCase`/`RestoreGameSystemUseCase`, all gated by `canManageEvents()`.
- `VenueQueries.listForOrganization` and `GameSystemQueries.listForOrganization` both take an optional `{ includeArchived }` flag. The create/edit event forms (which only need bookable options) call it without the flag; the venues/games management pages call it with `includeArchived: true` so archived entries are visible with a badge and a Restore button.
- New routes: `POST /api/venues/[venueId]/archive`, `POST /api/venues/[venueId]/restore`, `POST /api/game-systems/[gameSystemId]/archive`, `POST /api/game-systems/[gameSystemId]/restore`.

**Removed the unused `tailwindcss` dependency.** It sat in `package.json` with no config file and no actual Tailwind classes anywhere in the codebase — all styling is hand-written CSS in `globals.css`. This was flagged as a stack-mismatch against the README (which names Tailwind + shadcn/ui) rather than a missing feature; removing the dead dependency is a truthful fix, not a feature build. Adopting Tailwind/shadcn for real would mean rewriting every component's styling and hasn't been done, since that's a large, mostly-cosmetic undertaking with no functional upside.

Verified live: created 3 registrations for a test event, bulk-checked-in 2 valid + 1 deliberately bogus registration ID in a single request, confirmed the two real ones flipped to `checked_in` in Postgres while the bogus one was reported as a per-item failure without blocking the batch, and confirmed the third (unselected) registration was untouched. Archived a venue, confirmed it disappeared from the default (active-only) listing but still appeared with `?includeArchived=true`, confirmed restoring it brought it back, and confirmed archiving twice in a row is rejected by the domain entity. Repeated the same archive/restore/double-archive sequence for a game system and confirmed the active-vs-total counts differ correctly.

