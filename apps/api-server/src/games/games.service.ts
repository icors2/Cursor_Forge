/**
 * Season-scoped game reads. Default is the active season unless historical is requested.
 */

import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import type { GameDetail, GameSummary, RosterPlayer, StatEvent } from "@volleyball-manager/shared-types";
import { ActiveSeasonService } from "../common/active-season.service";
import { PrismaService } from "../prisma/prisma.service";
import type { CreateGameDto } from "./games.dto";

/** Query string for list/detail season scope. */
export interface GameQuery {
  /** Opt-in historical read. */
  historical?: string;
  /** Required when historical=true. */
  seasonId?: string;
}

/** Maps a Prisma game row to the list DTO. */
function toSummary(game: {
  id: string;
  opponent: string;
  scheduledAt: Date;
  seasonId: string;
  team: { name: string };
  season: { name: string; isActive: boolean };
}): GameSummary {
  return {
    id: game.id,
    teamName: game.team.name,
    opponent: game.opponent,
    scheduledAt: game.scheduledAt.toISOString(),
    seasonId: game.seasonId,
    seasonName: game.season.name,
    seasonActive: game.season.isActive,
  };
}

/** Game + roster + stats for the coach pad and live board. */
@Injectable()
export class GamesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly seasons: ActiveSeasonService,
  ) {}

  /** Creates a game on an active-season team. scheduledAt is stored as UTC. */
  async create(dto: CreateGameDto): Promise<GameSummary> {
    const season = await this.seasons.getActiveSeason();
    const kickoff = new Date(dto.scheduledAt);
    if (Number.isNaN(kickoff.getTime())) {
      throw new BadRequestException("scheduledAt must be a UTC instant");
    }
    const team = await this.prisma.team.findFirst({
      where: { id: dto.teamId, seasonId: season.id },
    });
    if (!team) {
      throw new NotFoundException("Team not found in the active season");
    }
    const created = await this.prisma.game.create({
      data: {
        teamId: team.id,
        opponent: dto.opponent.trim(),
        scheduledAt: kickoff,
        seasonId: season.id,
      },
      include: { team: true, season: true },
    });
    return toSummary(created);
  }

  /** Lists games for the resolved season (active by default). */
  async list(query: GameQuery): Promise<GameSummary[]> {
    const seasonId = await this.seasons.resolveSeasonId({
      historical: query.historical === "true",
      seasonId: query.seasonId,
    });
    const games = await this.prisma.game.findMany({
      where: { seasonId },
      include: { team: true, season: true },
      orderBy: { scheduledAt: "asc" },
    });
    return games.map(toSummary);
  }

  /** Loads one game if it belongs to the resolved season. */
  async getById(id: string, query: GameQuery): Promise<GameDetail> {
    const seasonId = await this.seasons.resolveSeasonId({
      historical: query.historical === "true",
      seasonId: query.seasonId,
    });
    const game = await this.prisma.game.findFirst({
      where: { id, seasonId },
      include: {
        team: { include: { roster: { include: { user: true } } } },
        season: true,
        stats: { include: { roster: { include: { user: true } } }, orderBy: { timestamp: "asc" } },
      },
    });
    if (!game) {
      throw new NotFoundException("Game not found");
    }
    const roster: RosterPlayer[] = game.team.roster.map((row) => ({
      id: row.id,
      jerseyNum: row.jerseyNum,
      firstName: row.user.firstName,
      lastName: row.user.lastName,
      userId: row.userId,
    }));
    const stats: StatEvent[] = game.stats.map((stat) => ({
      id: stat.id,
      gameId: stat.gameId,
      rosterId: stat.rosterId,
      type: stat.type,
      timestamp: stat.timestamp.toISOString(),
      playerName: `${stat.roster.user.firstName} ${stat.roster.user.lastName}`,
      jerseyNum: stat.roster.jerseyNum,
    }));
    return { ...toSummary(game), roster, stats };
  }
}
