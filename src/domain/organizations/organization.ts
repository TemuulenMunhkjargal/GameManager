import { Entity } from "../shared/entity";
import { failure, success, type Result } from "../shared/result";

export type OrganizationId = string;

export type OrganizationType = "game_store" | "club" | "convention_team" | "community_group";

export type OrganizationStatus = "active" | "archived";

export type OrganizationProfileUpdate = {
  name: string;
  contactEmail: string;
  timezone: string;
  defaultVenueName: string;
  publicPageEnabled: boolean;
  waitlistsEnabledByDefault: boolean;
  discordWebhookUrl: string | null;
};

export class Organization extends Entity<OrganizationId> {
  public constructor(
    id: OrganizationId,
    public readonly name: string,
    public readonly slug: string,
    public readonly type: OrganizationType,
    public readonly timezone: string,
    public readonly contactEmail: string,
    public readonly defaultVenueName: string,
    public readonly publicPageEnabled: boolean,
    public readonly waitlistsEnabledByDefault: boolean,
    public readonly discordWebhookUrl: string | null,
    public readonly status: OrganizationStatus = "active",
  ) {
    super(id);
  }

  public get isActive(): boolean {
    return this.status === "active";
  }

  public updateProfile(update: OrganizationProfileUpdate): Result<Organization> {
    if (this.status === "archived") {
      return failure("Archived organizations can't be updated.");
    }

    const name = update.name.trim();
    const contactEmail = update.contactEmail.trim();
    const timezone = update.timezone.trim();
    const defaultVenueName = update.defaultVenueName.trim();

    if (!name) {
      return failure("Store name is required.");
    }

    if (!contactEmail.includes("@")) {
      return failure("A valid contact email is required.");
    }

    if (!timezone) {
      return failure("Timezone is required.");
    }

    if (!defaultVenueName) {
      return failure("Default venue name is required.");
    }

    return success(
      new Organization(
        this.id,
        name,
        this.slug,
        this.type,
        timezone,
        contactEmail,
        defaultVenueName,
        update.publicPageEnabled,
        update.waitlistsEnabledByDefault,
        update.discordWebhookUrl,
        this.status,
      ),
    );
  }

  public archive(): Result<Organization> {
    if (this.status === "archived") {
      return failure("This organization is already archived.");
    }

    return success(
      new Organization(
        this.id,
        this.name,
        this.slug,
        this.type,
        this.timezone,
        this.contactEmail,
        this.defaultVenueName,
        this.publicPageEnabled,
        this.waitlistsEnabledByDefault,
        this.discordWebhookUrl,
        "archived",
      ),
    );
  }
}
