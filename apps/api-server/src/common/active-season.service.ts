/**
 * Resolves the active season. First slice reads Postgres (no Redis cache).
 */

import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

/** Query flags for historical vs active-season reads. */
export interface SeasonScope {
  /** When true, require an explicit seasonId and skip the active default. */
  historical?: boolean;
  /** Target season when historical=true. */
  seasonId?: string;
}

/** Looks up Season.isActive and applies the Setup.md scoping rule. */
@Injectable()
export class ActiveSeasonService {
  constructor(private readonly prisma: PrismaService) {}

  /** Returns the unique active season or 404. */
  async getActiveSeason(): Promise<{ id: string; name: string; year: number }> {
    const season = await this.prisma.season.findFirst({ where: { isActive: true } });
    if (!season) {
      throw new NotFoundException("No active season");
    }
    return { id: season.id, name: season.name, year: season.year };
  }

  /**
   * Season id to use on Team/Game/Stat queries.
   * Historical views must pass both historical=true and a seasonId.
   */
  async resolveSeasonId(scope: SeasonScope): Promise<string> {
    if (scope.historical) {
      if (!scope.seasonId) {
        throw new NotFoundException("historical=true requires seasonId");
      }
      const found = await this.prisma.season.findUnique({ where: { id: scope.seasonId } });
      if (!found) {
        throw new NotFoundException("Season not found");
      }
      return found.id;
    }
    const active = await this.getActiveSeason();
    return active.id;
  }
}
