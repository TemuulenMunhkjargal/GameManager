import { MemberProfile } from "../../domain/members/member-profile";
import type { Result } from "../../domain/shared/result";
import type { EventId } from "../../domain/events/event";
import type { OrganizationId } from "../../domain/organizations/organization";
import type { MemberRepository } from "../members/ports";
import { RegisterForEventUseCase, type RegisterForEventOutcome } from "./register-for-event";

export type RegisterGuestForEventCommand = {
  organizationId: OrganizationId;
  eventId: EventId;
  attendeeName: string;
  attendeeEmail: string;
};

export class RegisterGuestForEventUseCase {
  public constructor(
    private readonly members: MemberRepository,
    private readonly registerForEvent: RegisterForEventUseCase,
    private readonly createId: () => string,
  ) {}

  public async execute(
    command: RegisterGuestForEventCommand,
  ): Promise<Result<RegisterForEventOutcome>> {
    const email = command.attendeeEmail.trim().toLowerCase();

    let memberProfile = await this.members.findByEmailForOrganization(
      command.organizationId,
      email,
    );

    if (!memberProfile) {
      memberProfile = new MemberProfile(
        this.createId(),
        command.organizationId,
        null,
        command.attendeeName.trim(),
        email,
        null,
        "active",
      );

      await this.members.save(memberProfile);
    }

    return this.registerForEvent.execute({
      organizationId: command.organizationId,
      eventId: command.eventId,
      memberProfileId: memberProfile.id,
    });
  }
}
