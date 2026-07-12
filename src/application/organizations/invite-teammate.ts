import { Membership } from "../../domain/organizations/membership";
import type { Role } from "../../domain/organizations/membership";
import type { OrganizationId } from "../../domain/organizations/organization";
import { failure, success, type Result } from "../../domain/shared/result";
import { requireTeamManagement } from "../shared/authorization";
import type { EmailGateway } from "../shared/email-gateway";
import type { MembershipRepository } from "./ports";

export type InviteTeammateCommand = {
  organizationId: OrganizationId;
  actorMembership: Membership | null;
  organizationName: string;
  email: string;
  role: Role;
  appBaseUrl: string;
};

export class InviteTeammateUseCase {
  public constructor(
    private readonly memberships: MembershipRepository,
    private readonly email: EmailGateway,
    private readonly createId: () => string,
  ) {}

  public async execute(command: InviteTeammateCommand): Promise<Result<Membership>> {
    const authorization = requireTeamManagement(command.actorMembership);

    if (!authorization.ok) {
      return authorization;
    }

    const email = command.email.trim().toLowerCase();

    if (!email) {
      return failure("An email address is required.");
    }

    if (command.role === "owner") {
      return failure("Owners can't be invited directly; transfer ownership separately.");
    }

    const existing = await this.memberships.findByEmail(command.organizationId, email);

    if (existing) {
      return failure(
        existing.status === "invited"
          ? "This person already has a pending invitation."
          : "This person is already on the team.",
      );
    }

    const invite = new Membership(
      this.createId(),
      command.organizationId,
      null,
      command.role,
      "invited",
      email,
    );

    await this.memberships.save(invite);

    await this.email.sendTeamInvite({
      to: email,
      organizationName: command.organizationName,
      role: command.role,
      signUpUrl: `${command.appBaseUrl}/sign-up`,
    });

    return success(invite);
  }
}
