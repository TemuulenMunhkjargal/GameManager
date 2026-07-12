import { Entity } from "../shared/entity";
import { failure, success, type Result } from "../shared/result";
import type { OrganizationId } from "./organization";

export type MembershipId = string;
export type UserId = string;
export type Role = "owner" | "admin" | "event_manager" | "staff" | "viewer";
export type MembershipStatus = "active" | "invited" | "suspended";

const eventManagementRoles: Role[] = ["owner", "admin", "event_manager"];
const billingManagementRoles: Role[] = ["owner", "admin"];
const teamManagementRoles: Role[] = ["owner", "admin"];

export class Membership extends Entity<MembershipId> {
  public constructor(
    id: MembershipId,
    public readonly organizationId: OrganizationId,
    /** Null while the membership is a pending invitation (see `invitedEmail`). */
    public readonly userId: UserId | null,
    public readonly role: Role,
    public readonly status: MembershipStatus,
    /** Set only for invitations that haven't been claimed by a real user yet. */
    public readonly invitedEmail: string | null = null,
  ) {
    super(id);

    if (status === "active" && !userId) {
      throw new Error("Active memberships must be linked to a user.");
    }
  }

  public canManageEvents(): boolean {
    return this.status === "active" && eventManagementRoles.includes(this.role);
  }

  public canManageBilling(): boolean {
    return this.status === "active" && billingManagementRoles.includes(this.role);
  }

  public canManageTeam(): boolean {
    return this.status === "active" && teamManagementRoles.includes(this.role);
  }

  public get isOwner(): boolean {
    return this.status === "active" && this.role === "owner";
  }

  public accept(userId: UserId): Result<Membership> {
    if (this.status !== "invited") {
      return failure("Only pending invitations can be accepted.");
    }

    return success(new Membership(this.id, this.organizationId, userId, this.role, "active", null));
  }

  public changeRole(newRole: Role): Result<Membership> {
    if (this.status === "suspended") {
      return failure("Suspended memberships can't have their role changed; reinstate them first.");
    }

    return success(
      new Membership(this.id, this.organizationId, this.userId, newRole, this.status, this.invitedEmail),
    );
  }

  public suspend(): Result<Membership> {
    if (this.status === "suspended") {
      return failure("This membership is already suspended.");
    }

    return success(
      new Membership(this.id, this.organizationId, this.userId, this.role, "suspended", null),
    );
  }

  public reinstate(): Result<Membership> {
    if (this.status !== "suspended") {
      return failure("Only suspended memberships can be reinstated.");
    }

    if (!this.userId) {
      return failure("Can't reinstate a membership with no linked user.");
    }

    return success(
      new Membership(this.id, this.organizationId, this.userId, this.role, "active", null),
    );
  }
}
