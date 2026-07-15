# Module Boundaries

## Domain

Owns entities and rules such as event capacity, registration, waitlists, check-in, payments, and
league standings. Table-session contracts live in the application layer and their atomic state
transitions are implemented by the SQLite adapter. Domain code does not import React, Next.js,
Drizzle, or integration SDKs.

## Application

Coordinates one user action at a time through use cases such as `CreateEventUseCase`,
`RegisterForEventUseCase`, and `CancelRegistrationUseCase`. It depends on repository and gateway
interfaces rather than concrete technology.

## Infrastructure

Implements persistence with embedded SQLite and Drizzle. Optional Resend and Discord adapters live
here as well. Database initialization is idempotent and runs before repositories are exposed.

## App

Contains Next.js pages and thin route handlers. Handlers validate input, call one use case, and
translate the result into an HTTP response. They do not contain domain rules.
