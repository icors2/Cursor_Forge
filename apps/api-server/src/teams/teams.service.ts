/**
 * Team + roster use-cases. List defaults to the active season.
 * Adding a player to a live roster requires that player's isDuesPaid flag.
 */

import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import type { RosterPlayer, TeamView } from "@volleyball-manager/shared-types";
import { ActiveSeasonService } from "../common/active-season.service";
import { PrismaService } from "../prisma/prisma.service";
import type { CreateRosterDto, CreateTeamDto } from "./teams.dto";

/** Isolated teams domain service. */
@Injectable()
export class TeamsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly seasons: ActiveSeasonService,
  ) {}

  /** Lists teams for the resolved season (active by default). */
  async list(historical?: string, seasonId?: string): Promise<TeamView[]> {
    const resolved = await this.seasons.resolveSeasonId({
      historical: historical === "true",
      seasonId,
    });
    const teams = await this.prisma.team.findMany({
      where: { seasonId: resolved },
      include: { season: true, _count: { select: { roster: true } } },
      orderBy: { name: "asc" },
    });
    return teams.map((team) => this.toView(team));
  }

  /** Loads one team if it belongs to the resolved season. */
  async getById(id: string, historical?: string, seasonId?: string): Promise<TeamView & { roster: RosterPlayer[] }> {
    const resolved = await this.seasons.resolveSeasonId({
      historical: historical === "true",
      seasonId,
    });
    const team = await this.prisma.team.findFirst({
      where: { id, seasonId: resolved },
      include: {
        season: true,
        _count: { select: { roster: true } },
        roster: { include: { user: true }, orderBy: { jerseyNum: "asc" } },
      },
    });
    if (!team) {
      throw new NotFoundException("Team not found");
    }
    return {
      ...this.toView(team),
      roster: team.roster.map((row) => ({
        id: row.id,
        jerseyNum: row.jerseyNum,
        firstName: row.user.firstName,
        lastName: row.user.lastName,
        userId: row.userId,
      })),
    };
  }

  /** Creates a team on the active season. */
  async create(dto: CreateTeamDto): Promise<TeamView> {
    const season = await this.seasons.getActiveSeason();
    const created = await this.prisma.team.create({
      data: { name: dto.name.trim(), seasonId: season.id },
      include: { season: true, _count: { select: { roster: true } } },
    });
    return this.toView(created);
  }

  /**
   * Adds a PLAYER to an active-season team.
   * Setup.md: dues often gate live-game roster eligibility — unpaid players are rejected.
   */
  async addRoster(teamId: string, dto: CreateRosterDto): Promise<RosterPlayer> {
    const season = await this.seasons.getActiveSeason();
    const team = await this.prisma.team.findFirst({ where: { id: teamId, seasonId: season.id } });
    if (!team) {
      throw new NotFoundException("Team not found in the active season");
    }
    const user = await this.prisma.user.findUnique({ where: { id: dto.userId } });
    if (!user || user.role !== "PLAYER") {
      throw new BadRequestException("Roster entries must be PLAYER accounts");
    }
    if (!user.isDuesPaid) {
      throw new BadRequestException("Player dues are unpaid");
    }
    const created = await this.prisma.roster.create({
      data: {
        teamId: team.id,
        userId: user.id,
        jerseyNum: dto.jerseyNum ?? null,
      },
      include: { user: true },
    });
    return {
      id: created.id,
      jerseyNum: created.jerseyNum,
      firstName: created.user.firstName,
      lastName: created.user.lastName,
      userId: created.userId,
    };
  }

  /** Maps a team + season to the public view. */
  private toView(team: {
    id: string;
    name: string;
    seasonId: string;
    season: { name: string; isActive: boolean };
    _count: { roster: number };
  }): TeamView {
    return {
      id: team.id,
      name: team.name,
      seasonId: team.seasonId,
      seasonName: team.season.name,
      seasonActive: team.season.isActive,
      rosterCount: team._count.roster,
    };
  }
}
