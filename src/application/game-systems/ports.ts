import type { GameSystemId, GameSystemType } from "../../domain/game-systems/game-system";
import type { OrganizationId } from "../../domain/organizations/organization";

export type GameSystemSummaryDTO = {
  id: GameSystemId;
  name: string;
  slug: string;
  type: GameSystemType;
  defaultCapacity: number;
  activeEventCount: number;
  notes: string;
};

export interface GameSystemQueries {
  listForOrganization(organizationId: OrganizationId): Promise<GameSystemSummaryDTO[]>;
}
