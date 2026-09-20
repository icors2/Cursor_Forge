/**
 * Season list + archiveSeason. Archive flips the active flag and inserts an empty season.
 * Existing teams/games/stats keep their seasonId (no data move).
 */

import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import type { ArchiveSeasonResult, SeasonView } from "@volleyball-manager/shared-types";
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

  /** Maps a Season row to the public view. */
  private toView(row: { id: string; year: number; name: string; isActive: boolean }): SeasonView {
    return { id: row.id, year: row.year, name: row.name, isActive: row.isActive };
  }
}
