import type { Membership } from "../../domain/organizations/membership";
import type { MembershipId, Role, UserId } from "../../domain/organizations/membership";
import type { Organization, OrganizationId } from "../../domain/organizations/organization";

export interface OrganizationRepository {
  findById(organizationId: OrganizationId): Promise<Organization | null>;
  save(organization: Organization): Promise<void>;
}

export type OrganizationSettingsDTO = {
  id: OrganizationId;
  name: string;
  publicSlug: string;
  timezone: string;
  contactEmail: string;
  defaultVenueName: string;
  publicPageEnabled: boolean;
  waitlistsEnabledByDefault: boolean;
  discordWebhookUrl: string | null;
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
  findById(membershipId: MembershipId, organizationId: OrganizationId): Promise<Membership | null>;
  findByEmail(organizationId: OrganizationId, email: string): Promise<Membership | null>;
  findInvitesByEmail(email: string): Promise<Membership[]>;
  countActiveOwners(organizationId: OrganizationId): Promise<number>;
  save(membership: Membership): Promise<void>;
}

export type TeamMemberDTO = {
  id: MembershipId;
  displayName: string;
  email: string;
  role: Role;
  status: "active" | "invited" | "suspended";
  /** False for invitations that were revoked before anyone claimed them — these can't be reinstated, only re-invited. */
  hasAccount: boolean;
};

export interface TeamQueries {
  listForOrganization(organizationId: OrganizationId): Promise<TeamMemberDTO[]>;
}
