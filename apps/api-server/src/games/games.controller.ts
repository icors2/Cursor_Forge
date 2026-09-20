/**
 * Authenticated game reads + COACH/ADMIN create. Defaults to the active season.
 */

import { Body, Controller, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
import type { GameDetail, GameSummary } from "@volleyball-manager/shared-types";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { CreateGameDto } from "./games.dto";
import { GamesService, type GameQuery } from "./games.service";

/** GET /games, POST /games, GET /games/:id */
@Controller("games")
@UseGuards(JwtAuthGuard, RolesGuard)
export class GamesController {
  constructor(private readonly games: GamesService) {}

  /** Lists games in the active season (or historical if flagged). */
  @Get()
  list(@Query() query: GameQuery): Promise<GameSummary[]> {
    return this.games.list(query);
  }

  /** COACH/ADMIN schedule a game on an active-season team. */
  @Post()
  @Roles("COACH", "ADMIN")
  create(@Body() body: CreateGameDto): Promise<GameSummary> {
    return this.games.create(body);
  }

  /** Game detail with roster and existing stat events. */
  @Get(":id")
  getById(@Param("id") id: string, @Query() query: GameQuery): Promise<GameDetail> {
    return this.games.getById(id, query);
  }
}
