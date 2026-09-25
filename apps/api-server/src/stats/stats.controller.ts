/**
 * Stat HTTP API. Writes are COACH/ADMIN only; reads are any authenticated role.
 */

import { BadRequestException, Body, Controller, Get, Post, Query, UseGuards } from "@nestjs/common";
import type { StatEvent } from "@volleyball-manager/shared-types";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { RecordStatDto } from "./stats.dto";
import { StatsGateway } from "./stats.gateway";
import { StatsService } from "./stats.service";

/** Persist-then-broadcast write path plus a list endpoint. */
@Controller("stats")
@UseGuards(JwtAuthGuard, RolesGuard)
export class StatsController {
  constructor(
    private readonly stats: StatsService,
    private readonly gateway: StatsGateway,
  ) {}

  /** Coach (or admin) records one event row, then fans it out on Socket.io. */
  @Post()
  @Roles("COACH", "ADMIN")
  async record(@Body() body: RecordStatDto): Promise<StatEvent> {
    const event = await this.stats.record(body);
    this.gateway.emitStatCreated(event);
    return event;
  }

  /** Lists events for a game (active season by default). */
  @Get()
  list(
    @Query("gameId") gameId: string,
    @Query("historical") historical?: string,
    @Query("seasonId") seasonId?: string,
  ): Promise<StatEvent[]> {
    if (!gameId) {
      throw new BadRequestException("gameId is required");
    }
    return this.stats.listForGame(gameId, historical, seasonId);
  }
}
