/**
 * Authenticated game reads. Defaults to the active season.
 */

import { Controller, Get, Param, Query, UseGuards } from "@nestjs/common";
import type { GameDetail, GameSummary } from "@volleyball-manager/shared-types";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { GamesService, type GameQuery } from "./games.service";

/** GET /games and GET /games/:id */
@Controller("games")
@UseGuards(JwtAuthGuard)
export class GamesController {
  constructor(private readonly games: GamesService) {}

  /** Lists games in the active season (or historical if flagged). */
  @Get()
  list(@Query() query: GameQuery): Promise<GameSummary[]> {
    return this.games.list(query);
  }

  /** Game detail with roster and existing stat events. */
  @Get(":id")
  getById(@Param("id") id: string, @Query() query: GameQuery): Promise<GameDetail> {
    return this.games.getById(id, query);
  }
}
