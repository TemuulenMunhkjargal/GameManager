import { Entity } from "../shared/entity";
import { failure, success, type Result } from "../shared/result";
import type { LeagueId } from "./league";
import type { MemberProfileId } from "../members/member-profile";

export type LeagueStandingId = string;

export class LeagueStanding extends Entity<LeagueStandingId> {
  public constructor(
    id: LeagueStandingId,
    public readonly leagueId: LeagueId,
    public readonly memberProfileId: MemberProfileId,
    public readonly wins: number,
    public readonly losses: number,
    public readonly draws: number,
  ) {
    super(id);
  }

  public get points(): number {
    return this.wins * 3 + this.draws;
  }

  public recordResult(result: "win" | "loss" | "draw"): Result<LeagueStanding> {
    const delta =
      result === "win" ? { wins: 1, losses: 0, draws: 0 } :
      result === "loss" ? { wins: 0, losses: 1, draws: 0 } :
      { wins: 0, losses: 0, draws: 1 };

    return success(
      new LeagueStanding(
        this.id, this.leagueId, this.memberProfileId,
        this.wins + delta.wins, this.losses + delta.losses, this.draws + delta.draws,
      ),
    );
  }
}
