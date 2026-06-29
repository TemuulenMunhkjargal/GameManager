import { and, eq } from "drizzle-orm";
import { Membership } from "../../../domain/organizations/membership";
import type { UserId } from "../../../domain/organizations/membership";
import type { OrganizationId } from "../../../domain/organizations/organization";
import type { MembershipRepository } from "../../../application/organizations/ports";
import type { Database } from "../client";
import { memberships } from "../schema";

export class DrizzleMembershipRepository implements MembershipRepository {
  public constructor(private readonly db: Database) {}

  public async findForUserAndOrganization(
    userId: UserId,
    organizationId: OrganizationId,
  ): Promise<Membership | null> {
    const [row] = await this.db
      .select()
      .from(memberships)
      .where(and(eq(memberships.userId, userId), eq(memberships.organizationId, organizationId)))
      .limit(1);

    return row ? new Membership(row.id, row.organizationId, row.userId, row.role, row.status) : null;
  }
}
