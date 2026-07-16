import { eq } from "drizzle-orm";
import type { OrganizationId } from "../../../domain/organizations/organization";
import type {
  OrganizationSettingsDTO,
  OrganizationSettingsQueries,
} from "../../../application/organizations/ports";
import type { Database } from "../client";
import { organizations } from "../schema";

export class DrizzleOrganizationSettingsQueries implements OrganizationSettingsQueries {
  public constructor(private readonly db: Database) {}

  public async get(organizationId: OrganizationId): Promise<OrganizationSettingsDTO | null> {
    const [row] = await this.db
      .select()
      .from(organizations)
      .where(eq(organizations.id, organizationId))
      .limit(1);

    return row ? {
      id: row.id,
      name: row.name,
      timezone: row.timezone,
      contactEmail: row.contactEmail,
      waitlistsEnabledByDefault: row.waitlistsEnabledByDefault,
      discordWebhookUrl: row.discordWebhookUrl,
    } : null;
  }
}
