# Domain Model and Class Diagram

This model is intentionally modular. It captures the first business capabilities without locking us into one game type or event format.

## Core Concepts

- **Organization**: a game store, club, convention team, or hobby group.
- **User**: authenticated person using the platform.
- **Membership**: a user's role inside an organization.
- **MemberProfile**: a customer/player identity inside an organization.
- **Venue**: physical place where events happen.
- **Room**: optional subdivision of a venue, such as a play room or table area.
- **GameSystem**: Magic, Pokemon, D&D, Warhammer, board games, etc.
- **Event**: a scheduled activity with capacity, visibility, and registration rules.
- **Registration**: a member's RSVP or paid entry for an event.
- **WaitlistEntry**: a member waiting for a seat.
- **Payment**: record of event-entry payment intent and status.
- **Announcement**: message sent to event attendees or organization members.
- **League**: recurring structure tied to events and standings.

## Class Diagram

```mermaid
classDiagram
  class Organization {
    +OrganizationId id
    +string name
    +string slug
    +OrganizationType type
    +string timezone
    +OrganizationStatus status
    +updateProfile()
    +archive()
  }

  class User {
    +UserId id
    +string email
    +string displayName
    +UserStatus status
  }

  class Membership {
    +MembershipId id
    +OrganizationId organizationId
    +UserId userId
    +Role role
    +MembershipStatus status
    +canManageEvents()
    +canManageBilling()
  }

  class MemberProfile {
    +MemberProfileId id
    +OrganizationId organizationId
    +UserId userId
    +string displayName
    +string? phone
    +MemberStatus status
  }

  class Venue {
    +VenueId id
    +OrganizationId organizationId
    +string name
    +string? address
    +VenueStatus status
  }

  class Room {
    +RoomId id
    +VenueId venueId
    +string name
    +int? capacity
  }

  class GameSystem {
    +GameSystemId id
    +string name
    +string slug
    +GameSystemType type
  }

  class Event {
    +EventId id
    +OrganizationId organizationId
    +GameSystemId? gameSystemId
    +VenueId? venueId
    +RoomId? roomId
    +string title
    +EventStatus status
    +Visibility visibility
    +DateTime startsAt
    +DateTime endsAt
    +int capacity
    +Money? entryFee
    +bool waitlistEnabled
    +publish()
    +cancel()
    +hasCapacity()
    +canRegister()
  }

  class Registration {
    +RegistrationId id
    +EventId eventId
    +MemberProfileId memberProfileId
    +RegistrationStatus status
    +DateTime registeredAt
    +DateTime? checkedInAt
    +checkIn()
    +cancel()
  }

  class WaitlistEntry {
    +WaitlistEntryId id
    +EventId eventId
    +MemberProfileId memberProfileId
    +int position
    +WaitlistStatus status
    +promote()
    +withdraw()
  }

  class Payment {
    +PaymentId id
    +RegistrationId registrationId
    +Money amount
    +PaymentProvider provider
    +PaymentStatus status
    +string? providerReference
    +markPaid()
    +markFailed()
    +refund()
  }

  class Announcement {
    +AnnouncementId id
    +OrganizationId organizationId
    +EventId? eventId
    +string subject
    +string body
    +AnnouncementAudience audience
    +AnnouncementStatus status
    +schedule()
    +markSent()
  }

  class League {
    +LeagueId id
    +OrganizationId organizationId
    +GameSystemId gameSystemId
    +string name
    +LeagueStatus status
    +start()
    +complete()
  }

  class LeagueStanding {
    +LeagueStandingId id
    +LeagueId leagueId
    +MemberProfileId memberProfileId
    +int wins
    +int losses
    +int draws
    +int points
    +recordResult()
  }

  Organization "1" --> "*" Membership
  User "1" --> "*" Membership
  Organization "1" --> "*" MemberProfile
  User "1" --> "*" MemberProfile
  Organization "1" --> "*" Venue
  Venue "1" --> "*" Room
  Organization "1" --> "*" Event
  GameSystem "1" --> "*" Event
  Venue "1" --> "*" Event
  Room "1" --> "*" Event
  Event "1" --> "*" Registration
  MemberProfile "1" --> "*" Registration
  Event "1" --> "*" WaitlistEntry
  MemberProfile "1" --> "*" WaitlistEntry
  Registration "1" --> "0..1" Payment
  Organization "1" --> "*" Announcement
  Event "1" --> "*" Announcement
  Organization "1" --> "*" League
  GameSystem "1" --> "*" League
  League "1" --> "*" LeagueStanding
  MemberProfile "1" --> "*" LeagueStanding
```

## Important Invariants

- Only staff with event permissions can create, publish, cancel, or edit events.
- A member can only have one active registration per event.
- Registrations cannot exceed event capacity.
- If capacity is full and waitlists are enabled, new requests become waitlist entries.
- Paid events must have a successful payment before a registration becomes confirmed.
- Canceled events cannot accept new registrations.
- Organization data must be tenant-scoped in every query.

