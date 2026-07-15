import type { OrganizationId } from "../../domain/organizations/organization";

export type TableOccupantDTO = {
  id: string;
  memberProfileId: string | null;
  name: string;
  seatedAt: string;
};

export type GameTableDTO = {
  id: string;
  name: string;
  capacity: number;
  status: "active" | "archived";
  sessionId: string | null;
  occupiedSince: string | null;
  occupants: TableOccupantDTO[];
};

export interface TableRepository {
  listForOrganization(organizationId: OrganizationId): Promise<GameTableDTO[]>;
  create(organizationId: OrganizationId, name: string, capacity: number): Promise<void>;
  update(organizationId: OrganizationId, tableId: string, name: string, capacity: number): Promise<void>;
  seat(input: {
    organizationId: OrganizationId;
    tableId: string;
    memberProfileId?: string | null;
    guestName?: string | null;
  }): Promise<void>;
  move(organizationId: OrganizationId, seatId: string, targetTableId: string): Promise<void>;
  releaseSeat(organizationId: OrganizationId, seatId: string): Promise<void>;
  releaseTable(organizationId: OrganizationId, tableId: string): Promise<void>;
  delete(organizationId: OrganizationId, tableId: string): Promise<void>;
}
