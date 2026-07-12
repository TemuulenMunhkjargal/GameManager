import { and, desc, eq } from "drizzle-orm";
import { League, type LeagueId } from "../../../domain/leagues/league";
import { LeagueStanding } from "../../../domain/leagues/league-standing";
import type { OrganizationId } from "../../../domain/organizations/organization";
import type { MemberProfileId } from "../../../domain/members/member-profile";
import type { LeagueQueries, LeagueRepository, LeagueStandingRepository, LeagueSummaryDTO } from "../../../application/leagues/ports";
import type { Database } from "../client";
import { leagues, leagueStandings, memberProfiles } from "../schema";

export class DrizzleLeagueRepository implements LeagueRepository, LeagueQueries, LeagueStandingRepository {
  public constructor(private readonly db: Database) {}

  public async findById(leagueId: LeagueId, organizationId: OrganizationId): Promise<League | null> {
    const [row] = await this.db.select().from(leagues)
      .where(and(eq(leagues.id, leagueId), eq(leagues.organizationId, organizationId))).limit(1);
    if (!row) return null;
    return new League(row.id, row.organizationId, row.gameSystemId, row.gameSystemLabel,
      row.name, row.description, row.status, row.startsAt, row.endsAt);
  }

  public async save(league: League): Promise<void>;
  public async save(standing: LeagueStanding): Promise<void>;
  public async save(entity: League | LeagueStanding): Promise<void> {
    if (entity instanceof League) {
      const v = { id: entity.id, organizationId: entity.organizationId, gameSystemId: entity.gameSystemId,
        gameSystemLabel: entity.gameSystemLabel, name: entity.name, description: entity.description,
        status: entity.status, startsAt: entity.startsAt, endsAt: entity.endsAt };
      await this.db.insert(leagues).values(v).onConflictDoUpdate({ target: leagues.id, set: v });
    } else {
      const v = { id: entity.id, leagueId: entity.leagueId, memberProfileId: entity.memberProfileId,
        wins: entity.wins, losses: entity.losses, draws: entity.draws };
      await this.db.insert(leagueStandings).values(v).onConflictDoUpdate({ target: leagueStandings.id, set: v });
    }
  }

  public async findForMember(leagueId: LeagueId, memberProfileId: MemberProfileId): Promise<LeagueStanding | null> {
    const [row] = await this.db.select().from(leagueStandings)
      .where(and(eq(leagueStandings.leagueId, leagueId), eq(leagueStandings.memberProfileId, memberProfileId))).limit(1);
    return row ? new LeagueStanding(row.id, row.leagueId, row.memberProfileId, row.wins, row.losses, row.draws) : null;
  }

  public async listForOrganization(organizationId: OrganizationId): Promise<LeagueSummaryDTO[]> {
    const rows = await this.db.select().from(leagues)
      .where(eq(leagues.organizationId, organizationId)).orderBy(desc(leagues.createdAt));
    return Promise.all(rows.map((r) => this.toDTO(r)));
  }

  public async getDetail(leagueId: LeagueId, organizationId: OrganizationId): Promise<LeagueSummaryDTO | null> {
    const [row] = await this.db.select().from(leagues)
      .where(and(eq(leagues.id, leagueId), eq(leagues.organizationId, organizationId))).limit(1);
    return row ? this.toDTO(row) : null;
  }

  private async toDTO(row: typeof leagues.$inferSelect): Promise<LeagueSummaryDTO> {
    const standingRows = await this.db
      .select({ id: leagueStandings.id, wins: leagueStandings.wins, losses: leagueStandings.losses,
        draws: leagueStandings.draws, name: memberProfiles.displayName })
      .from(leagueStandings)
      .innerJoin(memberProfiles, eq(memberProfiles.id, leagueStandings.memberProfileId))
      .where(eq(leagueStandings.leagueId, row.id));

    const standings = standingRows
      .map((s) => ({ id: s.id, memberName: s.name, wins: s.wins, losses: s.losses, draws: s.draws,
        points: s.wins * 3 + s.draws }))
      .sort((a, b) => b.points - a.points || b.wins - a.wins);

    return { id: row.id, name: row.name, gameSystemLabel: row.gameSystemLabel,
      description: row.description, status: row.status,
      startsAt: row.startsAt?.toISOString() ?? null, endsAt: row.endsAt?.toISOString() ?? null,
      participantCount: standings.length, standings };
  }
}
