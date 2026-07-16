# Module Boundaries

## Domain

Owns entities and rules such as event capacity, registration, waitlists, check-in, payments, and
league competition. League participants, rounds, matches, entries, results, ratings, tie-breakers,
and auditable point adjustments form the competition model; standings are calculated projections.
Domain code does not import React, Next.js, Drizzle, Electron, or integration SDKs.

## Application

Coordinates one user action at a time through use cases such as `CreateEventUseCase`,
`RegisterForEventUseCase`, and `CancelRegistrationUseCase`. It depends on repository and gateway
interfaces rather than concrete technology.

## Infrastructure

Implements persistence with embedded SQLite and Drizzle plus the optional Discord webhook adapter.
Database initialization is idempotent, migrations are backed up before they run, list reads are
bounded, and repositories are not exposed until initialization finishes.

## App

Contains Next.js pages and thin route handlers. Handlers validate input, call a use case, and
translate the result into an HTTP response. They do not contain domain rules. Client mutations use
a shared timeout-aware request helper so an interrupted request cannot leave a form permanently busy.

## Desktop

The Electron shell starts and monitors the bundled local server, authenticates loopback requests,
runs scheduled maintenance, constrains navigation and permissions, and recovers the application
window from transient renderer failures.
