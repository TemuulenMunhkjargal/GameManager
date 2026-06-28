import { Event as DomainEvent } from "@/domain/events/event";
import { Money } from "@/domain/shared/money";

export type EventRecord = {
  id: string;
  organizationId: string;
  title: string;
  description: string;
  gameSystem: string;
  venueName: string;
  roomName: string | null;
  startsAt: string;
  endsAt: string;
  capacity: number;
  entryFeeInCents: number;
  status: "draft" | "published" | "cancelled" | "completed";
  visibility: "public" | "unlisted" | "private";
  waitlistEnabled: boolean;
  createdAt: string;
};

export type RegistrationRecord = {
  id: string;
  eventId: string;
  attendeeName: string;
  attendeeEmail: string;
  status: "pending_payment" | "confirmed" | "cancelled" | "checked_in" | "waitlisted";
  registeredAt: string;
  checkedInAt: string | null;
};

export type MemberRecord = {
  id: string;
  displayName: string;
  email: string;
  phone: string | null;
  favoriteGameSystem: string;
  status: "active" | "blocked" | "archived";
  joinedAt: string;
};

export type GameSystemRecord = {
  id: string;
  name: string;
  slug: string;
  type: "tcg" | "ttrpg" | "miniatures" | "board_game" | "other";
  defaultCapacity: number;
  activeEventCount: number;
  notes: string;
};

export type OrganizationSettingsRecord = {
  id: string;
  name: string;
  publicSlug: string;
  timezone: string;
  contactEmail: string;
  defaultVenueName: string;
  publicPageEnabled: boolean;
  waitlistsEnabledByDefault: boolean;
};

export type EventWithStats = EventRecord & {
  confirmedCount: number;
  waitlistCount: number;
};

type StoreState = {
  events: EventRecord[];
  registrations: RegistrationRecord[];
  members: MemberRecord[];
  gameSystems: GameSystemRecord[];
  settings: OrganizationSettingsRecord;
};

const organizationId = "org_mana_vault";

const state: StoreState = {
  events: [
    {
      id: "event_friday_magic",
      organizationId,
      title: "Friday Night Draft",
      description: "Three rounds of booster draft with casual prizes and open tables after round one.",
      gameSystem: "Magic: The Gathering",
      venueName: "Mana Vault Games",
      roomName: "Main Play Room",
      startsAt: nextDateAt(5, 19, 0),
      endsAt: nextDateAt(5, 22, 30),
      capacity: 24,
      entryFeeInCents: 1500,
      status: "published",
      visibility: "public",
      waitlistEnabled: true,
      createdAt: new Date().toISOString(),
    },
    {
      id: "event_campaign_night",
      organizationId,
      title: "D&D One-Shot Night",
      description: "Beginner-friendly tables with pre-generated characters and a rotating GM pool.",
      gameSystem: "Dungeons & Dragons",
      venueName: "Mana Vault Games",
      roomName: "Adventure Room",
      startsAt: nextDateAt(2, 18, 30),
      endsAt: nextDateAt(2, 21, 30),
      capacity: 12,
      entryFeeInCents: 500,
      status: "published",
      visibility: "public",
      waitlistEnabled: true,
      createdAt: new Date().toISOString(),
    },
  ],
  registrations: [
    {
      id: "reg_1",
      eventId: "event_friday_magic",
      attendeeName: "Mara Chen",
      attendeeEmail: "mara@example.com",
      status: "confirmed",
      registeredAt: new Date().toISOString(),
      checkedInAt: null,
    },
    {
      id: "reg_2",
      eventId: "event_friday_magic",
      attendeeName: "Jon Bell",
      attendeeEmail: "jon@example.com",
      status: "checked_in",
      registeredAt: new Date().toISOString(),
      checkedInAt: new Date().toISOString(),
    },
  ],
  members: [
    {
      id: "member_mara",
      displayName: "Mara Chen",
      email: "mara@example.com",
      phone: "(312) 555-0198",
      favoriteGameSystem: "Magic: The Gathering",
      status: "active",
      joinedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 42).toISOString(),
    },
    {
      id: "member_jon",
      displayName: "Jon Bell",
      email: "jon@example.com",
      phone: null,
      favoriteGameSystem: "Dungeons & Dragons",
      status: "active",
      joinedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 18).toISOString(),
    },
    {
      id: "member_asha",
      displayName: "Asha Patel",
      email: "asha@example.com",
      phone: "(773) 555-0133",
      favoriteGameSystem: "Pokemon TCG",
      status: "active",
      joinedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(),
    },
  ],
  gameSystems: [
    {
      id: "game_magic",
      name: "Magic: The Gathering",
      slug: "magic-the-gathering",
      type: "tcg",
      defaultCapacity: 24,
      activeEventCount: 1,
      notes: "Drafts, Commander pods, prereleases, and casual leagues.",
    },
    {
      id: "game_dnd",
      name: "Dungeons & Dragons",
      slug: "dungeons-and-dragons",
      type: "ttrpg",
      defaultCapacity: 12,
      activeEventCount: 1,
      notes: "One-shots, campaign nights, learn-to-play tables, and GM rotations.",
    },
    {
      id: "game_pokemon",
      name: "Pokemon TCG",
      slug: "pokemon-tcg",
      type: "tcg",
      defaultCapacity: 32,
      activeEventCount: 0,
      notes: "League play, trade nights, learn-to-play days, and release events.",
    },
    {
      id: "game_warhammer",
      name: "Warhammer",
      slug: "warhammer",
      type: "miniatures",
      defaultCapacity: 8,
      activeEventCount: 0,
      notes: "Escalation leagues, paint nights, demo tables, and tournament days.",
    },
  ],
  settings: {
    id: organizationId,
    name: "Mana Vault Games",
    publicSlug: "mana-vault-games",
    timezone: "America/Chicago",
    contactEmail: "events@manavault.example",
    defaultVenueName: "Mana Vault Games",
    publicPageEnabled: true,
    waitlistsEnabledByDefault: true,
  },
};

function nextDateAt(dayOfWeek: number, hour: number, minute: number): string {
  const date = new Date();
  const distance = (dayOfWeek + 7 - date.getDay()) % 7 || 7;
  date.setDate(date.getDate() + distance);
  date.setHours(hour, minute, 0, 0);
  return date.toISOString();
}

function createId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID().slice(0, 8)}`;
}

function getConfirmedCount(eventId: string): number {
  return state.registrations.filter(
    (registration) =>
      registration.eventId === eventId &&
      (registration.status === "confirmed" || registration.status === "checked_in"),
  ).length;
}

function toEventWithStats(event: EventRecord): EventWithStats {
  return {
    ...event,
    confirmedCount: getConfirmedCount(event.id),
    waitlistCount: state.registrations.filter(
      (registration) => registration.eventId === event.id && registration.status === "waitlisted",
    ).length,
  };
}

export function listEvents(): EventWithStats[] {
  return state.events
    .map(toEventWithStats)
    .sort((first, second) => first.startsAt.localeCompare(second.startsAt));
}

export function getEvent(eventId: string): EventWithStats | null {
  const event = state.events.find((candidate) => candidate.id === eventId);
  return event ? toEventWithStats(event) : null;
}

export function listRegistrations(eventId: string): RegistrationRecord[] {
  return state.registrations
    .filter((registration) => registration.eventId === eventId)
    .sort((first, second) => first.registeredAt.localeCompare(second.registeredAt));
}

export function listMembers(): MemberRecord[] {
  return [...state.members].sort((first, second) =>
    first.displayName.localeCompare(second.displayName),
  );
}

export function listGameSystems(): GameSystemRecord[] {
  return [...state.gameSystems].sort((first, second) => first.name.localeCompare(second.name));
}

export function getOrganizationSettings(): OrganizationSettingsRecord {
  return { ...state.settings };
}

export function getDashboardSummary() {
  const events = listEvents();
  const registrations = state.registrations;
  const confirmedRegistrations = registrations.filter(
    (registration) => registration.status === "confirmed" || registration.status === "checked_in",
  );
  const checkedInRegistrations = registrations.filter(
    (registration) => registration.status === "checked_in",
  );
  const revenueInCents = events.reduce(
    (total, event) => total + event.entryFeeInCents * event.confirmedCount,
    0,
  );

  return {
    upcomingEvents: events.filter((event) => new Date(event.startsAt) > new Date()).length,
    activeMembers: state.members.filter((member) => member.status === "active").length,
    confirmedSeats: confirmedRegistrations.length,
    checkedInSeats: checkedInRegistrations.length,
    revenueInCents,
    nextEvent: events[0] ?? null,
  };
}

export type CreateEventInput = {
  title: string;
  description: string;
  gameSystem: string;
  venueName: string;
  roomName?: string | null;
  startsAt: string;
  endsAt: string;
  capacity: number;
  entryFeeInCents: number;
  waitlistEnabled: boolean;
};

export function createEvent(input: CreateEventInput): EventWithStats {
  const startsAt = new Date(input.startsAt);
  const endsAt = new Date(input.endsAt);

  if (!input.title.trim()) {
    throw new Error("Event title is required.");
  }

  if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) {
    throw new Error("Event start and end times are required.");
  }

  const event = new DomainEvent(
    createId("event"),
    organizationId,
    input.title.trim(),
    "published",
    "public",
    startsAt,
    endsAt,
    input.capacity,
    0,
    input.waitlistEnabled,
    input.entryFeeInCents > 0 ? Money.usd(input.entryFeeInCents) : null,
    null,
    null,
    null,
  );

  const record: EventRecord = {
    id: event.id,
    organizationId,
    title: input.title.trim(),
    description: input.description.trim(),
    gameSystem: input.gameSystem.trim() || "Other",
    venueName: input.venueName.trim() || "Store",
    roomName: input.roomName?.trim() || null,
    startsAt: startsAt.toISOString(),
    endsAt: endsAt.toISOString(),
    capacity: input.capacity,
    entryFeeInCents: input.entryFeeInCents,
    status: "published",
    visibility: "public",
    waitlistEnabled: input.waitlistEnabled,
    createdAt: new Date().toISOString(),
  };

  state.events.push(record);
  return toEventWithStats(record);
}

export type RegisterInput = {
  attendeeName: string;
  attendeeEmail: string;
};

export function registerForEvent(eventId: string, input: RegisterInput): RegistrationRecord {
  const event = getEvent(eventId);

  if (!event) {
    throw new Error("Event not found.");
  }

  const existing = state.registrations.find(
    (registration) =>
      registration.eventId === eventId &&
      registration.attendeeEmail.toLowerCase() === input.attendeeEmail.toLowerCase() &&
      registration.status !== "cancelled",
  );

  if (existing) {
    throw new Error("That email is already registered for this event.");
  }

  const domainEvent = new DomainEvent(
    event.id,
    event.organizationId,
    event.title,
    event.status,
    event.visibility,
    new Date(event.startsAt),
    new Date(event.endsAt),
    event.capacity,
    event.confirmedCount,
    event.waitlistEnabled,
    event.entryFeeInCents > 0 ? Money.usd(event.entryFeeInCents) : null,
    null,
    null,
    null,
  );

  const registrationMode = domainEvent.canRegister();

  if (!registrationMode.ok) {
    throw new Error(registrationMode.error);
  }

  const registration: RegistrationRecord = {
    id: createId("reg"),
    eventId,
    attendeeName: input.attendeeName.trim(),
    attendeeEmail: input.attendeeEmail.trim(),
    status: registrationMode.value === "waitlisted" ? "waitlisted" : "confirmed",
    registeredAt: new Date().toISOString(),
    checkedInAt: null,
  };

  state.registrations.push(registration);
  return registration;
}

export function checkInRegistration(eventId: string, registrationId: string): RegistrationRecord {
  const registration = state.registrations.find(
    (candidate) => candidate.eventId === eventId && candidate.id === registrationId,
  );

  if (!registration) {
    throw new Error("Registration not found.");
  }

  if (registration.status !== "confirmed") {
    throw new Error("Only confirmed registrations can be checked in.");
  }

  registration.status = "checked_in";
  registration.checkedInAt = new Date().toISOString();
  return registration;
}
