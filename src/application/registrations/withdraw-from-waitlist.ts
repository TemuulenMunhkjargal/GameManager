import { WaitlistEntry } from "../../domain/registrations/waitlist-entry";
import { failure, success, type Result } from "../../domain/shared/result";
import type { EventId } from "../../domain/events/event";
import type { WaitlistRepository } from "./ports";

export type WithdrawFromWaitlistCommand = {
  eventId: EventId;
  waitlistEntryId: string;
};

export class WithdrawFromWaitlistUseCase {
  public constructor(private readonly waitlist: WaitlistRepository) {}

  public async execute(command: WithdrawFromWaitlistCommand): Promise<Result<WaitlistEntry>> {
    const entry = await this.waitlist.findById(command.waitlistEntryId, command.eventId);

    if (!entry) {
      return failure("Waitlist entry not found.");
    }

    const result = entry.withdraw();

    if (!result.ok) {
      return result;
    }

    await this.waitlist.save(result.value);

    return result;
  }
}
