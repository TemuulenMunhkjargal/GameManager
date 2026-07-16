import type { Organization, OrganizationId } from "../../domain/organizations/organization";
import { failure, type Result } from "../../domain/shared/result";
import type { OrganizationRepository } from "./ports";

export type UpdateOrganizationProfileCommand = {
  organizationId: OrganizationId;
  name: string;
  contactEmail: string;
  timezone: string;
  waitlistsEnabledByDefault: boolean;
  discordWebhookUrl: string | null;
};

export class UpdateOrganizationProfileUseCase {
  public constructor(private readonly organizations: OrganizationRepository) {}

  public async execute(command: UpdateOrganizationProfileCommand): Promise<Result<Organization>> {
    const organization = await this.organizations.findById(command.organizationId);

    if (!organization) {
      return failure("Organization not found.");
    }

    const result = organization.updateProfile({
      name: command.name,
      contactEmail: command.contactEmail,
      timezone: command.timezone,
      waitlistsEnabledByDefault: command.waitlistsEnabledByDefault,
      discordWebhookUrl: command.discordWebhookUrl,
    });

    if (!result.ok) {
      return result;
    }

    await this.organizations.save(result.value);

    return result;
  }
}
