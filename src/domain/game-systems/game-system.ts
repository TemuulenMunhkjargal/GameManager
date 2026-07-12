import { Entity } from "../shared/entity";
import { failure, success, type Result } from "../shared/result";
import type { OrganizationId } from "../organizations/organization";

export type GameSystemId = string;
export type GameSystemType = "tcg" | "ttrpg" | "miniatures" | "board_game" | "other";
export type GameSystemStatus = "active" | "archived";

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export class GameSystem extends Entity<GameSystemId> {
  public constructor(
    id: GameSystemId,
    public readonly organizationId: OrganizationId,
    public readonly name: string,
    public readonly slug: string,
    public readonly type: GameSystemType,
    public readonly defaultCapacity: number,
    public readonly notes: string,
    public readonly status: GameSystemStatus = "active",
  ) {
    super(id);
  }

  public static create(options: {
    id: GameSystemId;
    organizationId: OrganizationId;
    name: string;
    type: GameSystemType;
    defaultCapacity: number;
    notes: string;
  }): Result<GameSystem> {
    const name = options.name.trim();

    if (!name) {
      return failure("Game system name is required.");
    }

    if (options.defaultCapacity < 1) {
      return failure("Default capacity must be at least 1.");
    }

    return success(
      new GameSystem(
        options.id,
        options.organizationId,
        name,
        slugify(name),
        options.type,
        options.defaultCapacity,
        options.notes.trim(),
        "active",
      ),
    );
  }

  public archive(): Result<GameSystem> {
    if (this.status === "archived") {
      return failure("This game system is already archived.");
    }

    return success(
      new GameSystem(
        this.id,
        this.organizationId,
        this.name,
        this.slug,
        this.type,
        this.defaultCapacity,
        this.notes,
        "archived",
      ),
    );
  }

  public restore(): Result<GameSystem> {
    if (this.status === "active") {
      return failure("This game system is already active.");
    }

    return success(
      new GameSystem(
        this.id,
        this.organizationId,
        this.name,
        this.slug,
        this.type,
        this.defaultCapacity,
        this.notes,
        "active",
      ),
    );
  }
}
