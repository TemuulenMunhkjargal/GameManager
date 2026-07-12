import type { GameSystem, GameSystemId, GameSystemType } from "../../domain/game-systems/game-system";
import type { OrganizationId } from "../../domain/organizations/organization";

export interface GameSystemRepository {
  findById(gameSystemId: GameSystemId, organizationId: OrganizationId): Promise<GameSystem | null>;
  save(gameSystem: GameSystem): Promise<void>;
}

export type GameSystemSummaryDTO = {
  id: GameSystemId;
  name: string;
  slug: string;
  type: GameSystemType;
  defaultCapacity: number;
  activeEventCount: number;
  notes: string;
  status: string;
};

export interface GameSystemQueries {
  listForOrganization(
    organizationId: OrganizationId,
    options?: { includeArchived?: boolean },
  ): Promise<GameSystemSummaryDTO[]>;
}
