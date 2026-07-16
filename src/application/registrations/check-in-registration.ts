import type { Registration, RegistrationId } from "../../domain/registrations/registration";
import { failure, type Result } from "../../domain/shared/result";
import type { EventId } from "../../domain/events/event";
import type { RegistrationRepository } from "./ports";

export type CheckInRegistrationCommand = {
  eventId: EventId;
  registrationId: RegistrationId;
};

export class CheckInRegistrationUseCase {
  public constructor(private readonly registrations: RegistrationRepository) {}

  public async execute(command: CheckInRegistrationCommand): Promise<Result<Registration>> {
    const registration = await this.registrations.findById(
      command.registrationId,
      command.eventId,
    );

    if (!registration) {
      return failure("Registration not found.");
    }

    const result = registration.checkIn();

    if (!result.ok) {
      return result;
    }

    await this.registrations.save(result.value);

    return result;
  }
}
