import { eq } from "drizzle-orm";
import { Organization, type OrganizationId } from "../../../domain/organizations/organization";
import type { OrganizationRepository } from "../../../application/organizations/ports";
import type { Database } from "../client";
import { organizations } from "../schema";

export class DrizzleOrganizationRepository implements OrganizationRepository {
  public constructor(private readonly db: Database) {}

  public async findById(organizationId: OrganizationId): Promise<Organization | null> {
    const [row] = await this.db
      .select()
      .from(organizations)
      .where(eq(organizations.id, organizationId))
      .limit(1);

    if (!row) {
      return null;
    }

    return new Organization(
      row.id,
      row.name,
      row.publicSlug,
      row.type,
      row.timezone,
      row.contactEmail,
      row.defaultVenueName,
      row.publicPageEnabled,
      row.waitlistsEnabledByDefault,
      row.discordWebhookUrl,
      row.status,
    );
  }

  public async save(organization: Organization): Promise<void> {
    const values = {
      id: organization.id,
      name: organization.name,
      publicSlug: organization.slug,
      type: organization.type,
      timezone: organization.timezone,
      contactEmail: organization.contactEmail,
      defaultVenueName: organization.defaultVenueName,
      publicPageEnabled: organization.publicPageEnabled,
      waitlistsEnabledByDefault: organization.waitlistsEnabledByDefault,
      discordWebhookUrl: organization.discordWebhookUrl,
      status: organization.status,
    };

    await this.db
      .insert(organizations)
      .values(values)
      .onConflictDoUpdate({ target: organizations.id, set: values });
  }
}
