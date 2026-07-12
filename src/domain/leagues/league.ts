import { Entity } from "../shared/entity";
import { failure, success, type Result } from "../shared/result";
import type { OrganizationId } from "../organizations/organization";
import type { GameSystemId } from "../game-systems/game-system";

export type LeagueId = string;
export type LeagueStatus = "draft" | "active" | "completed" | "archived";

export class League extends Entity<LeagueId> {
  public constructor(
    id: LeagueId,
    public readonly organizationId: OrganizationId,
    public readonly gameSystemId: GameSystemId | null,
    public readonly gameSystemLabel: string,
    public readonly name: string,
    public readonly description: string,
    public readonly status: LeagueStatus,
    public readonly startsAt: Date | null,
    public readonly endsAt: Date | null,
  ) {
    super(id);
  }

  public start(): Result<League> {
    if (this.status === "active") {
      return failure("League is already active.");
    }

    if (this.status === "completed" || this.status === "archived") {
      return failure("Only draft leagues can be started.");
    }

    return success(this.withStatus("active"));
  }

  public complete(): Result<League> {
    if (this.status !== "active") {
      return failure("Only active leagues can be completed.");
    }

    return success(this.withStatus("completed"));
  }

  public archive(): Result<League> {
    if (this.status === "archived") {
      return failure("League is already archived.");
    }

    return success(this.withStatus("archived"));
  }

  private withStatus(status: LeagueStatus): League {
    return new League(
      this.id, this.organizationId, this.gameSystemId, this.gameSystemLabel,
      this.name, this.description, status, this.startsAt, this.endsAt,
    );
  }
}
