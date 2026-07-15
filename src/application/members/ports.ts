import type { MemberProfile, MemberProfileId } from "../../domain/members/member-profile";
import type { OrganizationId } from "../../domain/organizations/organization";

export interface MemberRepository {
  findByEmailForOrganization(
    organizationId: OrganizationId,
    email: string,
  ): Promise<MemberProfile | null>;
  findById(memberProfileId: MemberProfileId): Promise<MemberProfile | null>;
  save(memberProfile: MemberProfile): Promise<void>;
  delete(memberProfileId: MemberProfileId, organizationId: OrganizationId): Promise<boolean>;
}

export type MemberSummaryDTO = {
  id: MemberProfileId;
  displayName: string;
  email: string | null;
  phone: string | null;
  favoriteGameSystem: string;
  status: string;
  joinedAt: string;
};

export interface MemberQueries {
  listForOrganization(organizationId: OrganizationId): Promise<MemberSummaryDTO[]>;
}
