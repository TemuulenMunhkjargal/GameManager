import type { Venue, VenueId } from "../../domain/organizations/venue";
import type { Membership } from "../../domain/organizations/membership";
import type { OrganizationId } from "../../domain/organizations/organization";
import { failure, type Result } from "../../domain/shared/result";
import { requireEventManagement } from "../shared/authorization";
import type { VenueRepository } from "./ports";

export class ArchiveVenueUseCase {
  public constructor(private readonly venues: VenueRepository) {}

  public async execute(cmd: {
    organizationId: OrganizationId;
    actorMembership: Membership | null;
    venueId: VenueId;
  }): Promise<Result<Venue>> {
    const auth = requireEventManagement(cmd.actorMembership);
    if (!auth.ok) return auth;

    const venue = await this.venues.findById(cmd.venueId, cmd.organizationId);
    if (!venue) return failure("Venue not found.");

    const result = venue.archive();
    if (!result.ok) return result;

    await this.venues.save(result.value);
    return result;
  }
}

export class RestoreVenueUseCase {
  public constructor(private readonly venues: VenueRepository) {}

  public async execute(cmd: {
    organizationId: OrganizationId;
    actorMembership: Membership | null;
    venueId: VenueId;
  }): Promise<Result<Venue>> {
    const auth = requireEventManagement(cmd.actorMembership);
    if (!auth.ok) return auth;

    const venue = await this.venues.findById(cmd.venueId, cmd.organizationId);
    if (!venue) return failure("Venue not found.");

    const result = venue.restore();
    if (!result.ok) return result;

    await this.venues.save(result.value);
    return result;
  }
}
