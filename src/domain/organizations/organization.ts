import { Entity } from "../shared/entity";
import { failure, success, type Result } from "../shared/result";

export type OrganizationId = string;

export type OrganizationProfileUpdate = {
  name: string;
  contactEmail: string;
  timezone: string;
  waitlistsEnabledByDefault: boolean;
  discordWebhookUrl: string | null;
};

export class Organization extends Entity<OrganizationId> {
  public constructor(
    id: OrganizationId,
    public readonly name: string,
    public readonly timezone: string,
    public readonly contactEmail: string,
    public readonly waitlistsEnabledByDefault: boolean,
    public readonly discordWebhookUrl: string | null,
  ) {
    super(id);
  }

  public updateProfile(update: OrganizationProfileUpdate): Result<Organization> {
    const name = update.name.trim();
    const contactEmail = update.contactEmail.trim();
    const timezone = update.timezone.trim();

    if (!name) {
      return failure("Workspace name is required.");
    }

    if (contactEmail && !contactEmail.includes("@")) {
      return failure("A valid contact email is required.");
    }

    if (!timezone) {
      return failure("Timezone is required.");
    }

    return success(
      new Organization(
        this.id,
        name,
        timezone,
        contactEmail,
        update.waitlistsEnabledByDefault,
        update.discordWebhookUrl,
      ),
    );
  }
}
