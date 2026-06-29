import type { Membership } from "../../domain/organizations/membership";
import type { OrganizationId } from "../../domain/organizations/organization";
import type { UserId } from "../../domain/organizations/membership";

export type OrganizationSettingsDTO = {
  id: OrganizationId;
  name: string;
  publicSlug: string;
  timezone: string;
  contactEmail: string;
  defaultVenueName: string;
  publicPageEnabled: boolean;
  waitlistsEnabledByDefault: boolean;
};

export interface OrganizationSettingsQueries {
  get(organizationId: OrganizationId): Promise<OrganizationSettingsDTO | null>;
}

/**
 * "Who is making this request" — resolved by an infrastructure adapter
 * (Better Auth, in our case) from the current request's session. Use cases
 * and route handlers depend on this interface, never on the auth library
 * directly.
 */
export type AuthenticatedUser = {
  id: UserId;
  email: string;
  displayName: string;
};

export interface CurrentUserProvider {
  getCurrentUser(): Promise<AuthenticatedUser | null>;
}

export interface MembershipRepository {
  findForUserAndOrganization(
    userId: UserId,
    organizationId: OrganizationId,
  ): Promise<Membership | null>;
}

