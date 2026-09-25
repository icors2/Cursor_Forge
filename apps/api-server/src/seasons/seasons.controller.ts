/**
 * Season HTTP API. List is any auth role; archiveSeason is ADMIN-only.
 */

import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import type { ArchiveSeasonResult, SeasonHistoryView, SeasonView } from "@volleyball-manager/shared-types";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { ArchiveSeasonDto } from "./seasons.dto";
import { SeasonsService } from "./seasons.service";

/** Isolated season routes. */
@Controller("seasons")
@UseGuards(JwtAuthGuard, RolesGuard)
export class SeasonsController {
  constructor(private readonly seasons: SeasonsService) {}

  /** Lists all seasons so the UI can pick a historical seasonId. */
  @Get()
  list(): Promise<SeasonView[]> {
    return this.seasons.list();
  }

  /** Current active season (the default scope for Team/Game/Stat queries). */
  @Get("active")
  active(): Promise<SeasonView> {
    return this.seasons.getActive();
  }

  /** ADMIN archive: deactivate current, create a new empty season. */
  @Post("archive")
  @Roles("ADMIN")
  archive(@Body() body: ArchiveSeasonDto): Promise<ArchiveSeasonResult> {
    return this.seasons.archiveSeason(body);
  }

  /** Printable season rollup (active or archived). */
  @Get(":id/history")
  history(@Param("id") id: string): Promise<SeasonHistoryView> {
    return this.seasons.history(id);
  }
}
