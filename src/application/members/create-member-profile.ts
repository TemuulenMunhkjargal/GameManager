import { MemberProfile } from "../../domain/members/member-profile";
import type { Membership } from "../../domain/organizations/membership";
import type { OrganizationId } from "../../domain/organizations/organization";
import { failure, success, type Result } from "../../domain/shared/result";
import { requireEventManagement } from "../shared/authorization";
import type { MemberRepository } from "./ports";

export type CreateMemberProfileCommand = {
  organizationId: OrganizationId;
  actorMembership: Membership | null;
  displayName: string;
  email: string | null;
  phone: string | null;
  favoriteGameSystem: string;
};

export class CreateMemberProfileUseCase {
  public constructor(
    private readonly members: MemberRepository,
    private readonly createId: () => string,
  ) {}

  public async execute(command: CreateMemberProfileCommand): Promise<Result<MemberProfile>> {
    const authorization = requireEventManagement(command.actorMembership);

    if (!authorization.ok) {
      return authorization;
    }

    const displayName = command.displayName.trim();

    if (!displayName) {
      return failure("Display name is required.");
    }

    const email = command.email?.trim().toLowerCase() || null;

    if (email) {
      const existing = await this.members.findByEmailForOrganization(command.organizationId, email);

      if (existing) {
        return failure("A member with this email already exists.");
      }
    }

    const memberProfile = new MemberProfile(
      this.createId(),
      command.organizationId,
      null,
      displayName,
      email,
      command.phone?.trim() || null,
      "active",
    );

    await this.members.save(memberProfile);

    return success(memberProfile);
  }
}
