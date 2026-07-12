import type { GameSystem, GameSystemId } from "../../domain/game-systems/game-system";
import type { Membership } from "../../domain/organizations/membership";
import type { OrganizationId } from "../../domain/organizations/organization";
import { failure, type Result } from "../../domain/shared/result";
import { requireEventManagement } from "../shared/authorization";
import type { GameSystemRepository } from "./ports";

export class ArchiveGameSystemUseCase {
  public constructor(private readonly gameSystems: GameSystemRepository) {}

  public async execute(cmd: {
    organizationId: OrganizationId;
    actorMembership: Membership | null;
    gameSystemId: GameSystemId;
  }): Promise<Result<GameSystem>> {
    const auth = requireEventManagement(cmd.actorMembership);
    if (!auth.ok) return auth;

    const gameSystem = await this.gameSystems.findById(cmd.gameSystemId, cmd.organizationId);
    if (!gameSystem) return failure("Game system not found.");

    const result = gameSystem.archive();
    if (!result.ok) return result;

    await this.gameSystems.save(result.value);
    return result;
  }
}

export class RestoreGameSystemUseCase {
  public constructor(private readonly gameSystems: GameSystemRepository) {}

  public async execute(cmd: {
    organizationId: OrganizationId;
    actorMembership: Membership | null;
    gameSystemId: GameSystemId;
  }): Promise<Result<GameSystem>> {
    const auth = requireEventManagement(cmd.actorMembership);
    if (!auth.ok) return auth;

    const gameSystem = await this.gameSystems.findById(cmd.gameSystemId, cmd.organizationId);
    if (!gameSystem) return failure("Game system not found.");

    const result = gameSystem.restore();
    if (!result.ok) return result;

    await this.gameSystems.save(result.value);
    return result;
  }
}
