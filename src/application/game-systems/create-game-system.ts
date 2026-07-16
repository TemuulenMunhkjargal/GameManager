import { GameSystem } from "../../domain/game-systems/game-system";
import type { GameSystemType } from "../../domain/game-systems/game-system";
import type { OrganizationId } from "../../domain/organizations/organization";
import type { Result } from "../../domain/shared/result";
import type { GameSystemRepository } from "./ports";

export type CreateGameSystemCommand = {
  organizationId: OrganizationId;
  name: string;
  type: GameSystemType;
  defaultCapacity: number;
  notes: string;
};

export class CreateGameSystemUseCase {
  public constructor(
    private readonly gameSystems: GameSystemRepository,
    private readonly createId: () => string,
  ) {}

  public async execute(command: CreateGameSystemCommand): Promise<Result<GameSystem>> {
    const result = GameSystem.create({
      id: this.createId(),
      organizationId: command.organizationId,
      name: command.name,
      type: command.type,
      defaultCapacity: command.defaultCapacity,
      notes: command.notes,
    });

    if (!result.ok) {
      return result;
    }

    await this.gameSystems.save(result.value);

    return result;
  }
}
