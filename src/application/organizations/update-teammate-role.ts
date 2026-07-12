import type { Membership, MembershipId, Role } from "../../domain/organizations/membership";
import type { OrganizationId } from "../../domain/organizations/organization";
import { failure, type Result } from "../../domain/shared/result";
import { requireTeamManagement } from "../shared/authorization";
import type { MembershipRepository } from "./ports";

export type UpdateTeammateRoleCommand = {
  organizationId: OrganizationId;
  actorMembership: Membership | null;
  membershipId: MembershipId;
  newRole: Role;
};

export class UpdateTeammateRoleUseCase {
  public constructor(private readonly memberships: MembershipRepository) {}

  public async execute(command: UpdateTeammateRoleCommand): Promise<Result<Membership>> {
    const authorization = requireTeamManagement(command.actorMembership);

    if (!authorization.ok) {
      return authorization;
    }

    const membership = await this.memberships.findById(command.membershipId, command.organizationId);

    if (!membership) {
      return failure("Membership not found.");
    }

    if (membership.isOwner && command.newRole !== "owner") {
      const ownerCount = await this.memberships.countActiveOwners(command.organizationId);

      if (ownerCount <= 1) {
        return failure("There must always be at least one owner.");
      }
    }

    const result = membership.changeRole(command.newRole);

    if (!result.ok) {
      return result;
    }

    await this.memberships.save(result.value);

    return result;
  }
}
