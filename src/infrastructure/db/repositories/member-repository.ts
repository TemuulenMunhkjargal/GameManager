import { and, eq, ilike } from "drizzle-orm";
import { MemberProfile, type MemberProfileId } from "../../../domain/members/member-profile";
import type { OrganizationId } from "../../../domain/organizations/organization";
import type {
  MemberQueries,
  MemberRepository,
  MemberSummaryDTO,
} from "../../../application/members/ports";
import type { Database } from "../client";
import { memberProfiles } from "../schema";

export class DrizzleMemberRepository implements MemberRepository, MemberQueries {
  public constructor(private readonly db: Database) {}

  public async findByEmailForOrganization(
    organizationId: OrganizationId,
    email: string,
  ): Promise<MemberProfile | null> {
    const [row] = await this.db
      .select()
      .from(memberProfiles)
      .where(and(eq(memberProfiles.organizationId, organizationId), ilike(memberProfiles.email, email)))
      .limit(1);

    return row
      ? new MemberProfile(row.id, row.organizationId, row.userId, row.displayName, row.email, row.phone, row.status)
      : null;
  }

  public async findById(memberProfileId: MemberProfileId): Promise<MemberProfile | null> {
    const [row] = await this.db
      .select()
      .from(memberProfiles)
      .where(eq(memberProfiles.id, memberProfileId))
      .limit(1);

    return row
      ? new MemberProfile(row.id, row.organizationId, row.userId, row.displayName, row.email, row.phone, row.status)
      : null;
  }

  public async save(memberProfile: MemberProfile): Promise<void> {
    const values = {
      id: memberProfile.id,
      organizationId: memberProfile.organizationId,
      userId: memberProfile.userId,
      displayName: memberProfile.displayName,
      email: memberProfile.email,
      phone: memberProfile.phone,
      status: memberProfile.status,
    };

    await this.db
      .insert(memberProfiles)
      .values(values)
      .onConflictDoUpdate({ target: memberProfiles.id, set: values });
  }

  public async listForOrganization(organizationId: OrganizationId): Promise<MemberSummaryDTO[]> {
    const rows = await this.db
      .select()
      .from(memberProfiles)
      .where(eq(memberProfiles.organizationId, organizationId));

    return rows
      .map((row) => ({
        id: row.id,
        displayName: row.displayName,
        email: row.email,
        phone: row.phone,
        favoriteGameSystem: row.favoriteGameSystem,
        status: row.status,
        joinedAt: row.joinedAt.toISOString(),
      }))
      .sort((first, second) => first.displayName.localeCompare(second.displayName));
  }
}
