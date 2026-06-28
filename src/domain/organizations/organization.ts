import { Entity } from "../shared/entity";

export type OrganizationId = string;

export type OrganizationType = "game_store" | "club" | "convention_team" | "community_group";

export type OrganizationStatus = "active" | "archived";

export class Organization extends Entity<OrganizationId> {
  public constructor(
    id: OrganizationId,
    public readonly name: string,
    public readonly slug: string,
    public readonly type: OrganizationType,
    public readonly timezone: string,
    public readonly status: OrganizationStatus = "active",
  ) {
    super(id);
  }

  public get isActive(): boolean {
    return this.status === "active";
  }
}

