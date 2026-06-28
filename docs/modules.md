# Module Boundaries

## Domain Layer

The domain layer owns business language and rules. It should not import React, Next.js, Drizzle, Stripe, Clerk, or any vendor SDK.

Examples:

- `Event.canRegister()`
- `Registration.checkIn()`
- `Membership.canManageEvents()`
- `Payment.markPaid()`

## Application Layer

The application layer coordinates use cases. It owns transaction flow, authorization, and calls to repositories or external ports.

Examples:

- `CreateEventUseCase`
- `RegisterForEventUseCase`
- `CancelRegistrationUseCase`
- `SendEventAnnouncementUseCase`

## Infrastructure Layer

The infrastructure layer implements ports using real technology.

Examples:

- `DrizzleEventRepository`
- `StripePaymentGateway`
- `ResendEmailGateway`
- `ClerkCurrentUserProvider`

## API Layer

Next.js route handlers and server actions should be thin.

They should:

- Parse input.
- Resolve the current user/session.
- Call one use case.
- Return a response or redirect.

They should not:

- Contain business rules.
- Import database tables directly for complex workflows.
- Call Stripe, email, or Discord SDKs directly.

