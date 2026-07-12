import type { EventId } from "../../domain/events/event";
import type { MemberProfileId } from "../../domain/members/member-profile";
import type { Registration, RegistrationId } from "../../domain/registrations/registration";
import type { WaitlistEntry, WaitlistEntryId } from "../../domain/registrations/waitlist-entry";

export interface RegistrationRepository {
  findActiveForEventMember(
    eventId: EventId,
    memberProfileId: MemberProfileId,
  ): Promise<Registration | null>;
  findById(registrationId: RegistrationId, eventId: EventId): Promise<Registration | null>;
  save(registration: Registration): Promise<void>;
}

export interface WaitlistRepository {
  findById(waitlistEntryId: WaitlistEntryId, eventId: EventId): Promise<WaitlistEntry | null>;
  findActiveForEventMember(
    eventId: EventId,
    memberProfileId: MemberProfileId,
  ): Promise<WaitlistEntry | null>;
  findNextWaiting(eventId: EventId): Promise<WaitlistEntry | null>;
  countActiveForEvent(eventId: EventId): Promise<number>;
  save(entry: WaitlistEntry): Promise<void>;
}

export type RegistrationSummaryDTO = {
  id: RegistrationId | WaitlistEntryId;
  eventId: EventId;
  attendeeName: string;
  attendeeEmail: string | null;
  status: string;
  registeredAt: string;
  checkedInAt: string | null;
  waitlistPosition: number | null;
  /** Null if the event is free or no payment record exists yet. */
  paymentStatus: "requires_payment" | "paid" | "failed" | "refunded" | null;
};

export interface RegistrationQueries {
  listForEvent(eventId: EventId): Promise<RegistrationSummaryDTO[]>;
}
