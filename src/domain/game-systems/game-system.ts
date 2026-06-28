import { Entity } from "../shared/entity";

export type GameSystemId = string;
export type GameSystemType = "tcg" | "ttrpg" | "miniatures" | "board_game" | "other";

export class GameSystem extends Entity<GameSystemId> {
  public constructor(
    id: GameSystemId,
    public readonly name: string,
    public readonly slug: string,
    public readonly type: GameSystemType,
  ) {
    super(id);
  }
}

