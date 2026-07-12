import { and, eq, or } from "drizzle-orm";
import { Membership } from "../../../domain/organizations/membership";
import type { MembershipId, UserId } from "../../../domain/organizations/membership";
import type { OrganizationId } from "../../../domain/organizations/organization";
import type { MembershipRepository } from "../../../application/organizations/ports";
import type { Database } from "../client";
import { authUsers, memberships } from "../schema";
import type { memberships as MembershipsTable } from "../schema";

type MembershipRow = typeof MembershipsTable.$inferSelect;

function toDomain(row: MembershipRow): Membership {
  return new Membership(row.id, row.organizationId, row.userId, row.role, row.status, row.invitedEmail);
}

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

    return row ? toDomain(row) : null;
  }

  public async findById(
    membershipId: MembershipId,
    organizationId: OrganizationId,
  ): Promise<Membership | null> {
    const [row] = await this.db
      .select()
      .from(memberships)
      .where(and(eq(memberships.id, membershipId), eq(memberships.organizationId, organizationId)))
      .limit(1);

    return row ? toDomain(row) : null;
  }

  public async findByEmail(organizationId: OrganizationId, email: string): Promise<Membership | null> {
    const [row] = await this.db
      .select({ membership: memberships })
      .from(memberships)
      .leftJoin(authUsers, eq(authUsers.id, memberships.userId))
      .where(
        and(
          eq(memberships.organizationId, organizationId),
          or(eq(memberships.invitedEmail, email), eq(authUsers.email, email)),
        ),
      )
      .limit(1);

    return row ? toDomain(row.membership) : null;
  }

  public async findInvitesByEmail(email: string): Promise<Membership[]> {
    const rows = await this.db
      .select()
      .from(memberships)
      .where(and(eq(memberships.invitedEmail, email), eq(memberships.status, "invited")));

    return rows.map(toDomain);
  }

  public async countActiveOwners(organizationId: OrganizationId): Promise<number> {
    const rows = await this.db
      .select({ id: memberships.id })
      .from(memberships)
      .where(
        and(
          eq(memberships.organizationId, organizationId),
          eq(memberships.role, "owner"),
          eq(memberships.status, "active"),
        ),
      );

    return rows.length;
  }

  public async save(membership: Membership): Promise<void> {
    const values = {
      id: membership.id,
      organizationId: membership.organizationId,
      userId: membership.userId,
      invitedEmail: membership.invitedEmail,
      role: membership.role,
      status: membership.status,
    };

    await this.db
      .insert(memberships)
      .values(values)
      .onConflictDoUpdate({ target: memberships.id, set: values });
  }
}
