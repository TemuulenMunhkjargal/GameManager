import type { UserId } from "../../domain/organizations/membership";
import type { MembershipRepository } from "./ports";

export class AcceptPendingInvitationsUseCase {
  public constructor(private readonly memberships: MembershipRepository) {}

  public async execute(email: string, userId: UserId): Promise<void> {
    const invites = await this.memberships.findInvitesByEmail(email.trim().toLowerCase());

    for (const invite of invites) {
      const result = invite.accept(userId);

      if (result.ok) {
        await this.memberships.save(result.value);
      }
    }
  }
}
