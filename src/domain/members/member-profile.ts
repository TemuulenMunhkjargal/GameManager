import { Entity } from "../shared/entity";
import type { UserId } from "../organizations/membership";
import type { OrganizationId } from "../organizations/organization";

export type MemberProfileId = string;
export type MemberStatus = "active" | "blocked" | "archived";

export class MemberProfile extends Entity<MemberProfileId> {
  public constructor(
    id: MemberProfileId,
    public readonly organizationId: OrganizationId,
    public readonly userId: UserId | null,
    public readonly displayName: string,
    public readonly email: string | null,
    public readonly phone: string | null,
    public readonly favoriteGameSystem: string,
    public readonly status: MemberStatus,
  ) {
    super(id);
  }

  public get canRegisterForEvents(): boolean {
    return this.status === "active";
  }
}

