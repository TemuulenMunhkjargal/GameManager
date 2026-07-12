import type { Membership, MembershipId } from "../../domain/organizations/membership";
import type { OrganizationId } from "../../domain/organizations/organization";
import { failure, type Result } from "../../domain/shared/result";
import { requireTeamManagement } from "../shared/authorization";
import type { MembershipRepository } from "./ports";

export type ReinstateTeammateCommand = {
  organizationId: OrganizationId;
  actorMembership: Membership | null;
  membershipId: MembershipId;
};

export class ReinstateTeammateUseCase {
  public constructor(private readonly memberships: MembershipRepository) {}

  public async execute(command: ReinstateTeammateCommand): Promise<Result<Membership>> {
    const authorization = requireTeamManagement(command.actorMembership);

    if (!authorization.ok) {
      return authorization;
    }

    const membership = await this.memberships.findById(command.membershipId, command.organizationId);

    if (!membership) {
      return failure("Membership not found.");
    }

    const result = membership.reinstate();

    if (!result.ok) {
      return result;
    }

    await this.memberships.save(result.value);

    return result;
  }
}
