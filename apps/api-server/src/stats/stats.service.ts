/**
 * Event-sourced stat writes. Always INSERT a Stat row; never increment a counter.
 */

import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import type { StatEvent } from "@volleyball-manager/shared-types";
import { ActiveSeasonService } from "../common/active-season.service";
import { PrismaService } from "../prisma/prisma.service";
import type { RecordStatDto } from "./stats.dto";

/** Persists and shapes live-stat events. */
@Injectable()
export class StatsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly seasons: ActiveSeasonService,
  ) {}

  /**
   * Inserts one timestamped Stat event for a rostered player on an active-season game.
   */
  async record(dto: RecordStatDto): Promise<StatEvent> {
    const seasonId = await this.seasons.resolveSeasonId({});
    const game = await this.prisma.game.findFirst({
      where: { id: dto.gameId, seasonId },
      include: { team: true },
    });
    if (!game) {
      throw new NotFoundException("Game not found in the active season");
    }
    const roster = await this.prisma.roster.findFirst({
      where: { id: dto.rosterId, teamId: game.teamId },
      include: { user: true },
    });
    if (!roster) {
      throw new BadRequestException("Roster entry is not on this game's team");
    }

    const created = await this.prisma.stat.create({
      data: {
        gameId: game.id,
        rosterId: roster.id,
        type: dto.type,
      },
      include: { roster: { include: { user: true } } },
    });

    return {
      id: created.id,
      gameId: created.gameId,
      rosterId: created.rosterId,
      type: created.type,
      timestamp: created.timestamp.toISOString(),
      playerName: `${created.roster.user.firstName} ${created.roster.user.lastName}`,
      jerseyNum: created.roster.jerseyNum,
    };
  }

  /** Lists events for a game in the resolved season. */
  async listForGame(gameId: string, historical?: string, seasonId?: string): Promise<StatEvent[]> {
    const resolved = await this.seasons.resolveSeasonId({
      historical: historical === "true",
      seasonId,
    });
    const game = await this.prisma.game.findFirst({ where: { id: gameId, seasonId: resolved } });
    if (!game) {
      throw new NotFoundException("Game not found");
    }
    const rows = await this.prisma.stat.findMany({
      where: { gameId },
      include: { roster: { include: { user: true } } },
      orderBy: { timestamp: "asc" },
    });
    return rows.map((row) => ({
      id: row.id,
      gameId: row.gameId,
      rosterId: row.rosterId,
      type: row.type,
      timestamp: row.timestamp.toISOString(),
      playerName: `${row.roster.user.firstName} ${row.roster.user.lastName}`,
      jerseyNum: row.roster.jerseyNum,
    }));
  }
}
