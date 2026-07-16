import type { Organization, OrganizationId } from "../../domain/organizations/organization";

export interface OrganizationRepository {
  findById(organizationId: OrganizationId): Promise<Organization | null>;
  save(organization: Organization): Promise<void>;
}

export type OrganizationSettingsDTO = {
  id: OrganizationId;
  name: string;
  timezone: string;
  contactEmail: string;
  waitlistsEnabledByDefault: boolean;
  discordWebhookUrl: string | null;
};

export interface OrganizationSettingsQueries {
  get(organizationId: OrganizationId): Promise<OrganizationSettingsDTO | null>;
}
