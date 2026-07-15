# GameHall

GameHall is a personal workspace for planning game nights. It is designed for one host on one
installation: open the app and start organizing sessions, players, games, live tables, and leagues.
There are no accounts, roles, invitations, or sign-in flow.

## Product principles

- **Ready immediately** — no account creation or workspace setup.
- **Personal by default** — one host, one trusted installation, one game-night group.
- **Fast at the table** — the next useful action should always be obvious.
- **Local ownership** — the host controls their data and should be able to export it.

## Current features

- Plan and publish game nights
- Add local players to events and track seats, waitlists, payments, and check-ins
- Maintain a player directory
- Run a live table board with guests, moves, occupancy timers, and release history
- Switch event and league schedules between list and calendar views
- Export attendee, player, and standings data as CSV
- Send optional email or Discord announcements
- Create automatic and manual backups, and restore from a known backup or uploaded database
- Safely migrate existing desktop databases with a pre-upgrade snapshot

## Stack

- Next.js, React, and TypeScript
- Embedded SQLite with Drizzle ORM
- Route Handlers and server-side application use cases
- Resend and Discord webhooks as optional integrations

## Run locally

1. Install dependencies:

   ```bash
   npm install
   ```

2. Start GameHall:

   ```bash
   npm run dev
   ```

Open [http://localhost:3000](http://localhost:3000). GameHall opens directly to the game-night
workspace. On first launch it creates `.gamehall/gamehall.db` and initializes the workspace
automatically. No account, Docker container, database server, migration, or seed command is needed.
The bundled commands listen on `127.0.0.1` so the unauthenticated personal workspace is not exposed
to other devices on the network.

Copy `.env.example` to `.env.local` only if you want to configure optional integrations or use a
custom data location.

## Useful commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm run build` | Create a production build |
| `npm run typecheck` | Run the TypeScript compiler without emitting files |
| `npm test` | Run the automated test suite once |
| `npm run test:watch` | Re-run relevant tests while developing |
| `npm run test:coverage` | Run tests and produce a coverage report |
| `npm run desktop:dev` | Open GameHall in the Electron desktop shell |
| `npm run desktop:build` | Build the Windows installer in `release/` |

## Windows desktop build

The desktop edition packages the traced Next.js standalone server, a private Node runtime,
Electron, and SQLite into one installer. Root packages are build-time dependencies and are not
copied into the Electron shell a second time. The installed application does not require Node.js,
npm, Docker, or a database server. Its data is stored in the current Windows user's GameHall
application-data directory.

The Electron renderer is sandboxed, has no Node.js integration, denies permission requests and new
windows, and only permits navigation within GameHall's randomly assigned localhost origin.

## Data safety

GameHall creates at most one automatic SQLite backup per day and retains the seven newest daily
backups. Settings can also create and download a manual backup, restore a stored backup, or upload
a compatible GameHall database. Every restore first creates a pre-restore safety copy and validates
SQLite integrity, schema compatibility, and foreign-key relationships. Backups live beside the
active database in a `backups` directory. Database upgrades also create a pre-migration copy before
applying ordered schema migrations.

## Quality and releases

Every behavior change or bug fix should include an automated test. The CI workflow runs tests with
coverage, TypeScript checks, and a production build for every pull request and push to `main`.
The Windows release workflow repeats those checks and builds an installer. Manual runs save the
installer as a workflow artifact; pushing a version tag such as `v0.2.0` also creates a GitHub
release containing the installer.

## Architecture

The project keeps business rules separate from framework and persistence code:

- `src/domain/` contains entities and rules.
- `src/application/` contains use cases and repository interfaces.
- `src/infrastructure/` contains persistence and integration adapters.
- `src/app/` contains the Next.js interface and HTTP routes.

The application uses a single internal workspace identifier to keep repository boundaries stable.
It does not expose organizations, accounts, memberships, or roles to the user.

See [docs/architecture.md](docs/architecture.md), [docs/domain-model.md](docs/domain-model.md), and
[docs/modules.md](docs/modules.md) for the original architecture notes.
