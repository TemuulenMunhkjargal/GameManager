import type { EventId } from "../../domain/events/event";
import type { MemberProfileId } from "../../domain/members/member-profile";
import type { Registration } from "../../domain/registrations/registration";

export interface RegistrationRepository {
  findActiveForEventMember(
    eventId: EventId,
    memberProfileId: MemberProfileId,
  ): Promise<Registration | null>;
  save(registration: Registration): Promise<void>;
}

