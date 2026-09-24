/**
 * Season list + archiveSeason. Archive flips the active flag and inserts an empty season.
 * Existing teams/games/stats keep their seasonId (no data move).
 */

import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import type {
  ArchiveSeasonResult,
  GameSummary,
  SeasonHistoryView,
  SeasonPlayerTotals,
  SeasonView,
  StatType,
} from "@volleyball-manager/shared-types";
import { PrismaService } from "../prisma/prisma.service";
import type { ArchiveSeasonDto } from "./seasons.dto";

/** Isolated seasons domain service. */
@Injectable()
export class SeasonsService {
  private readonly logger = new Logger(SeasonsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Lists every season (newest year first). */
  async list(): Promise<SeasonView[]> {
    const rows = await this.prisma.season.findMany({ orderBy: [{ year: "desc" }, { name: "asc" }] });
    return rows.map((row) => this.toView(row));
  }

  /** Returns the unique active season. */
  async getActive(): Promise<SeasonView> {
    const season = await this.prisma.season.findFirst({ where: { isActive: true } });
    if (!season) {
      throw new NotFoundException("No active season");
    }
    return this.toView(season);
  }

  /**
   * Sets the current season isActive=false and creates a new empty active season.
   * Uses a transaction so the partial unique index on isActive never sees two trues.
   */
  async archiveSeason(dto: ArchiveSeasonDto): Promise<ArchiveSeasonResult> {
    const result = await this.prisma.$transaction(async (tx) => {
      const active = await tx.season.findFirst({ where: { isActive: true } });
      if (!active) {
        throw new NotFoundException("No active season");
      }
      const archived = await tx.season.update({
        where: { id: active.id },
        data: { isActive: false },
      });
      const created = await tx.season.create({
        data: {
          name: dto.name.trim(),
          year: dto.year,
          isActive: true,
        },
      });
      return { archived, created };
    });
    this.logger.log(`season_archived from=${result.archived.id} to=${result.created.id}`);
    return {
      archived: this.toView(result.archived),
      created: this.toView(result.created),
    };
  }

  /** Games plus per-player stat totals for one season (active or archived). */
  async history(seasonId: string): Promise<SeasonHistoryView> {
    const season = await this.prisma.season.findUnique({ where: { id: seasonId } });
    if (!season) {
      throw new NotFoundException("Season not found");
    }
    const games = await this.prisma.game.findMany({
      where: { seasonId },
      include: { team: true, season: true },
      orderBy: { scheduledAt: "asc" },
    });
    const stats = await this.prisma.stat.findMany({
      where: { game: { seasonId } },
      include: { roster: { include: { user: true } } },
    });
    const emptyTotals = (): Record<StatType, number> => ({
      KILL: 0,
      ACE: 0,
      BLOCK: 0,
      DIG: 0,
      ERROR: 0,
    });
    const byPlayer = new Map<string, SeasonPlayerTotals>();
    for (const stat of stats) {
      const key = stat.roster.userId;
      const current = byPlayer.get(key) ?? {
        userId: key,
        playerName: `${stat.roster.user.firstName} ${stat.roster.user.lastName}`,
        jerseyNum: stat.roster.jerseyNum,
        totals: emptyTotals(),
      };
      current.totals[stat.type] += 1;
      byPlayer.set(key, current);
    }
    const gameViews: GameSummary[] = games.map((game) => ({
      id: game.id,
      teamId: game.teamId,
      teamName: game.team.name,
      opponent: game.opponent,
      scheduledAt: game.scheduledAt.toISOString(),
      seasonId: game.seasonId,
      seasonName: game.season.name,
      seasonActive: game.season.isActive,
    }));
    return {
      season: this.toView(season),
      games: gameViews,
      players: [...byPlayer.values()].sort((a, b) => a.playerName.localeCompare(b.playerName)),
    };
  }

  /** Maps a Season row to the public view. */
  private toView(row: { id: string; year: number; name: string; isActive: boolean }): SeasonView {
    return { id: row.id, year: row.year, name: row.name, isActive: row.isActive };
  }
}
