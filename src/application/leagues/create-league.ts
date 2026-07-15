import { League } from "../../domain/leagues/league";
import { LeagueStanding } from "../../domain/leagues/league-standing";
import type { Membership } from "../../domain/organizations/membership";
import type { OrganizationId } from "../../domain/organizations/organization";
import type { LeagueFormat, LeagueId } from "../../domain/leagues/league";
import type { MemberProfileId } from "../../domain/members/member-profile";
import { failure, success, type Result } from "../../domain/shared/result";
import { requireEventManagement } from "../shared/authorization";
import type { LeagueRepository, LeagueStandingRepository } from "./ports";
import type { MemberRepository } from "../members/ports";
import { getLeagueFormat } from "../../lib/league-formats";

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
    format: LeagueFormat;
    startsAt: Date | null;
    endsAt: Date | null;
  }): Promise<Result<League>> {
    const auth = requireEventManagement(cmd.actorMembership);
    if (!auth.ok) return auth;

    const name = cmd.name.trim();
    if (!name) return failure("League name is required.");

    const league = new League(
      this.createId(), cmd.organizationId, null, cmd.gameSystemLabel.trim() || "Other",
      name, cmd.description.trim(), cmd.format, "draft", cmd.startsAt, cmd.endsAt,
    );

    await this.leagues.save(league);
    return success(league);
  }
}

export class RecordLeagueResultUseCase {
  public constructor(
    private readonly leagues: LeagueRepository,
    private readonly standings: LeagueStandingRepository,
    private readonly members: MemberRepository,
    private readonly createId: () => string,
  ) {}

  public async execute(cmd: {
    organizationId: OrganizationId;
    actorMembership: Membership | null;
    leagueId: LeagueId;
    memberProfileId: MemberProfileId;
    opponentProfileId: MemberProfileId;
    result: "win" | "loss" | "draw";
  }): Promise<Result<LeagueStanding>> {
    const auth = requireEventManagement(cmd.actorMembership);
    if (!auth.ok) return auth;

    const league = await this.leagues.findById(cmd.leagueId, cmd.organizationId);
    if (!league) return failure("League not found.");
    if (league.status !== "active") return failure("Results can only be recorded for active leagues.");
    if (getLeagueFormat(league.format).resultMode !== "head_to_head") return failure("This league format uses point awards instead of head-to-head results.");
    if (cmd.memberProfileId === cmd.opponentProfileId) return failure("Choose two different players.");
    const [member, opponent] = await Promise.all([this.members.findById(cmd.memberProfileId), this.members.findById(cmd.opponentProfileId)]);
    if (!member || !opponent || member.organizationId !== cmd.organizationId || opponent.organizationId !== cmd.organizationId || !member.canRegisterForEvents || !opponent.canRegisterForEvents) return failure("Choose two active players.");

    let standing = await this.standings.findForMember(cmd.leagueId, cmd.memberProfileId);

    if (!standing) {
      standing = new LeagueStanding(this.createId(), cmd.leagueId, cmd.memberProfileId, 0, 0, 0, 0);
    }

    let opponentStanding = await this.standings.findForMember(cmd.leagueId, cmd.opponentProfileId);
    if (!opponentStanding) opponentStanding = new LeagueStanding(this.createId(), cmd.leagueId, cmd.opponentProfileId, 0, 0, 0, 0);

    const updated = standing.recordResult(cmd.result);
    if (!updated.ok) return updated;

    const opponentResult = cmd.result === "win" ? "loss" : cmd.result === "loss" ? "win" : "draw";
    const updatedOpponent = opponentStanding.recordResult(opponentResult);
    if (!updatedOpponent.ok) return updatedOpponent;

    await this.standings.save(updated.value);
    await this.standings.save(updatedOpponent.value);
    return updated;
  }
}

export class AwardLeaguePointsUseCase {
  public constructor(
    private readonly leagues: LeagueRepository,
    private readonly standings: LeagueStandingRepository,
    private readonly members: MemberRepository,
    private readonly createId: () => string,
  ) {}

  public async execute(cmd: {
    organizationId: OrganizationId;
    actorMembership: Membership | null;
    leagueId: LeagueId;
    memberProfileId: MemberProfileId;
    points: number;
  }): Promise<Result<LeagueStanding>> {
    const auth = requireEventManagement(cmd.actorMembership);
    if (!auth.ok) return auth;
    if (!Number.isInteger(cmd.points) || cmd.points < -100 || cmd.points > 100 || cmd.points === 0) {
      return failure("Points must be a whole number from -100 to 100, excluding zero.");
    }

    const league = await this.leagues.findById(cmd.leagueId, cmd.organizationId);
    if (!league) return failure("League not found.");
    if (league.status !== "active") return failure("Points can only be recorded for active leagues.");
    if (getLeagueFormat(league.format).resultMode !== "points") return failure("This league format uses head-to-head results instead of direct point awards.");
    const member = await this.members.findById(cmd.memberProfileId);
    if (!member || member.organizationId !== cmd.organizationId || !member.canRegisterForEvents) {
      return failure("Choose an active player.");
    }

    let standing = await this.standings.findForMember(cmd.leagueId, cmd.memberProfileId);
    if (!standing) standing = new LeagueStanding(this.createId(), cmd.leagueId, cmd.memberProfileId, 0, 0, 0, 0);
    const updated = standing.awardPoints(cmd.points);
    if (!updated.ok) return updated;
    await this.standings.save(updated.value);
    return updated;
  }
}

export class CompleteLeagueUseCase {
  public constructor(private readonly leagues: LeagueRepository) {}
  public async execute(cmd: { organizationId: OrganizationId; actorMembership: Membership | null; leagueId: LeagueId }): Promise<Result<League>> {
    const auth = requireEventManagement(cmd.actorMembership); if (!auth.ok) return auth;
    const league = await this.leagues.findById(cmd.leagueId, cmd.organizationId); if (!league) return failure("League not found.");
    const result = league.complete(); if (!result.ok) return result; await this.leagues.save(result.value); return result;
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
