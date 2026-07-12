import type { Membership } from "../../domain/organizations/membership";
import type { EventId } from "../../domain/events/event";
import type { RegistrationId } from "../../domain/registrations/registration";
import { failure, success, type Result } from "../../domain/shared/result";
import { requireEventManagement } from "../shared/authorization";
import type { RegistrationRepository } from "./ports";

export type BulkCheckInCommand = {
  actorMembership: Membership | null;
  eventId: EventId;
  registrationIds: RegistrationId[];
};

export type BulkCheckInOutcome = {
  checkedIn: RegistrationId[];
  failed: { registrationId: RegistrationId; reason: string }[];
};

export class BulkCheckInUseCase {
  public constructor(private readonly registrations: RegistrationRepository) {}

  public async execute(command: BulkCheckInCommand): Promise<Result<BulkCheckInOutcome>> {
    const authorization = requireEventManagement(command.actorMembership);

    if (!authorization.ok) {
      return authorization;
    }

    const outcome: BulkCheckInOutcome = { checkedIn: [], failed: [] };

    // Sequential, not Promise.all — these are writes against the same event
    // and we want a deterministic, easy-to-reason-about order rather than
    // racing concurrent saves against the same underlying rows.
    for (const registrationId of command.registrationIds) {
      const registration = await this.registrations.findById(registrationId, command.eventId);

      if (!registration) {
        outcome.failed.push({ registrationId, reason: "Registration not found." });
        continue;
      }

      const result = registration.checkIn();

      if (!result.ok) {
        outcome.failed.push({ registrationId, reason: result.error });
        continue;
      }

      await this.registrations.save(result.value);
      outcome.checkedIn.push(registrationId);
    }

    if (outcome.checkedIn.length === 0 && outcome.failed.length > 0) {
      return failure("None of the selected registrations could be checked in.");
    }

    return success(outcome);
  }
}
