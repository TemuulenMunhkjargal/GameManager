import { eq } from "drizzle-orm";
import type { OrganizationId } from "../../../domain/organizations/organization";
import type { TeamMemberDTO, TeamQueries } from "../../../application/organizations/ports";
import type { Database } from "../client";
import { authUsers, memberships } from "../schema";

export class DrizzleTeamQueries implements TeamQueries {
  public constructor(private readonly db: Database) {}

  public async listForOrganization(organizationId: OrganizationId): Promise<TeamMemberDTO[]> {
    const rows = await this.db
      .select({
        id: memberships.id,
        userId: memberships.userId,
        role: memberships.role,
        status: memberships.status,
        invitedEmail: memberships.invitedEmail,
        userName: authUsers.name,
        userEmail: authUsers.email,
      })
      .from(memberships)
      .leftJoin(authUsers, eq(authUsers.id, memberships.userId))
      .where(eq(memberships.organizationId, organizationId));

    return rows
      .map((row) => ({
        id: row.id,
        displayName: row.userName ?? "Pending invite",
        email: row.userEmail ?? row.invitedEmail ?? "",
        role: row.role,
        status: row.status,
        hasAccount: row.userId !== null,
      }))
      .sort((first, second) => first.displayName.localeCompare(second.displayName));
  }
}
