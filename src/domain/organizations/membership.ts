import { Entity } from "../shared/entity";
import type { OrganizationId } from "./organization";

export type MembershipId = string;
export type UserId = string;
export type Role = "owner" | "admin" | "event_manager" | "staff" | "viewer";
export type MembershipStatus = "active" | "invited" | "suspended";

const eventManagementRoles: Role[] = ["owner", "admin", "event_manager"];
const billingManagementRoles: Role[] = ["owner", "admin"];

export class Membership extends Entity<MembershipId> {
  public constructor(
    id: MembershipId,
    public readonly organizationId: OrganizationId,
    public readonly userId: UserId,
    public readonly role: Role,
    public readonly status: MembershipStatus,
  ) {
    super(id);
  }

  public canManageEvents(): boolean {
    return this.status === "active" && eventManagementRoles.includes(this.role);
  }

  public canManageBilling(): boolean {
    return this.status === "active" && billingManagementRoles.includes(this.role);
  }
}

