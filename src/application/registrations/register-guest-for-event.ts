import { MemberProfile } from "../../domain/members/member-profile";
import { failure, type Result } from "../../domain/shared/result";
import type { EventId } from "../../domain/events/event";
import type { OrganizationId } from "../../domain/organizations/organization";
import type { EmailGateway } from "../shared/email-gateway";
import type { MemberRepository } from "../members/ports";
import type { EventRepository } from "../events/ports";
import { RegisterForEventUseCase, type RegisterForEventOutcome } from "./register-for-event";

export type RegisterGuestForEventCommand = {
  organizationId: OrganizationId;
  eventId: EventId;
  attendeeName: string;
  attendeeEmail: string;
};

export class RegisterGuestForEventUseCase {
  public constructor(
    private readonly events: EventRepository,
    private readonly members: MemberRepository,
    private readonly registerForEvent: RegisterForEventUseCase,
    private readonly email: EmailGateway,
    private readonly createId: () => string,
  ) {}

  public async execute(
    command: RegisterGuestForEventCommand,
  ): Promise<Result<RegisterForEventOutcome>> {
    const emailAddress = command.attendeeEmail.trim().toLowerCase();

    let memberProfile = await this.members.findByEmailForOrganization(
      command.organizationId,
      emailAddress,
    );

    if (!memberProfile) {
      memberProfile = new MemberProfile(
        this.createId(),
        command.organizationId,
        null,
        command.attendeeName.trim(),
        emailAddress,
        null,
        "active",
      );

      await this.members.save(memberProfile);
    }

    const result = await this.registerForEvent.execute({
      organizationId: command.organizationId,
      eventId: command.eventId,
      memberProfileId: memberProfile.id,
    });

    if (!result.ok) {
      return result;
    }

    const event = await this.events.findByIdForOrganization(command.eventId, command.organizationId);

    if (!event || !emailAddress) {
      return result;
    }

    const eventDate = event.startsAt.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });

    if (result.value.kind === "waitlisted") {
      await this.email.sendWaitlistConfirmation({
        to: emailAddress,
        attendeeName: memberProfile.displayName,
        eventTitle: event.title,
        eventDate,
        position: result.value.waitlistEntry.position,
      });
    } else {
      await this.email.sendRsvpConfirmation({
        to: emailAddress,
        attendeeName: memberProfile.displayName,
        eventTitle: event.title,
        eventDate,
        venueName: event.venueName,
        entryFeeInCents: event.entryFee?.amountInCents ?? 0,
      });
    }

    return result;
  }
}
