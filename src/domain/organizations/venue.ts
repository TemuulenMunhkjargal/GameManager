import { Entity } from "../shared/entity";
import { failure, success, type Result } from "../shared/result";
import type { OrganizationId } from "./organization";

export type VenueId = string;
export type VenueStatus = "active" | "archived";

export class Venue extends Entity<VenueId> {
  public constructor(
    id: VenueId,
    public readonly organizationId: OrganizationId,
    public readonly name: string,
    public readonly address: string | null,
    public readonly status: VenueStatus,
  ) {
    super(id);
  }

  public static create(options: {
    id: VenueId;
    organizationId: OrganizationId;
    name: string;
    address: string | null;
  }): Result<Venue> {
    const name = options.name.trim();

    if (!name) {
      return failure("Venue name is required.");
    }

    return success(new Venue(options.id, options.organizationId, name, options.address?.trim() || null, "active"));
  }

  public archive(): Result<Venue> {
    if (this.status === "archived") {
      return failure("Venue is already archived.");
    }

    return success(new Venue(this.id, this.organizationId, this.name, this.address, "archived"));
  }

  public restore(): Result<Venue> {
    if (this.status === "active") {
      return failure("Venue is already active.");
    }

    return success(new Venue(this.id, this.organizationId, this.name, this.address, "active"));
  }
}
