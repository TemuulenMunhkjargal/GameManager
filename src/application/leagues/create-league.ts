import { League } from "../../domain/leagues/league";
import { LeagueStanding } from "../../domain/leagues/league-standing";
import type { Membership } from "../../domain/organizations/membership";
import type { OrganizationId } from "../../domain/organizations/organization";
import type { LeagueId } from "../../domain/leagues/league";
import type { MemberProfileId } from "../../domain/members/member-profile";
import { failure, success, type Result } from "../../domain/shared/result";
import { requireEventManagement } from "../shared/authorization";
import type { LeagueRepository, LeagueStandingRepository } from "./ports";

export class CreateLeagueUseCase {
  public constructor(
    private readonly leagues: LeagueRepository,
    private readonly createId: () => string,
  ) {}

  public async execute(cmd: {
    organizationId: OrganizationId;
    actorMembership: Membership | null;
    name: string;
    description: string;
    gameSystemLabel: string;
    startsAt: Date | null;
    endsAt: Date | null;
  }): Promise<Result<League>> {
    const auth = requireEventManagement(cmd.actorMembership);
    if (!auth.ok) return auth;

    const name = cmd.name.trim();
    if (!name) return failure("League name is required.");

    const league = new League(
      this.createId(), cmd.organizationId, null, cmd.gameSystemLabel.trim() || "Other",
      name, cmd.description.trim(), "draft", cmd.startsAt, cmd.endsAt,
    );

    await this.leagues.save(league);
    return success(league);
  }
}

export class RecordLeagueResultUseCase {
  public constructor(
    private readonly leagues: LeagueRepository,
    private readonly standings: LeagueStandingRepository,
    private readonly createId: () => string,
  ) {}

  public async execute(cmd: {
    organizationId: OrganizationId;
    actorMembership: Membership | null;
    leagueId: LeagueId;
    memberProfileId: MemberProfileId;
    result: "win" | "loss" | "draw";
  }): Promise<Result<LeagueStanding>> {
    const auth = requireEventManagement(cmd.actorMembership);
    if (!auth.ok) return auth;

    const league = await this.leagues.findById(cmd.leagueId, cmd.organizationId);
    if (!league) return failure("League not found.");
    if (league.status !== "active") return failure("Results can only be recorded for active leagues.");

    let standing = await this.standings.findForMember(cmd.leagueId, cmd.memberProfileId);

    if (!standing) {
      standing = new LeagueStanding(this.createId(), cmd.leagueId, cmd.memberProfileId, 0, 0, 0);
    }

    const updated = standing.recordResult(cmd.result);
    if (!updated.ok) return updated;

    await this.standings.save(updated.value);
    return updated;
  }
}

export class StartLeagueUseCase {
  public constructor(private readonly leagues: LeagueRepository) {}

  public async execute(cmd: {
    organizationId: OrganizationId;
    actorMembership: Membership | null;
    leagueId: LeagueId;
  }): Promise<Result<League>> {
    const auth = requireEventManagement(cmd.actorMembership);
    if (!auth.ok) return auth;

    const league = await this.leagues.findById(cmd.leagueId, cmd.organizationId);
    if (!league) return failure("League not found.");

    const result = league.start();
    if (!result.ok) return result;

    await this.leagues.save(result.value);
    return result;
  }
}
