/**
 * Isolated games module (season-scoped reads + active-season create).
 */

import { Module } from "@nestjs/common";
import { GamesController } from "./games.controller";
import { GamesService } from "./games.service";

/** Registers game HTTP routes. */
@Module({
  controllers: [GamesController],
  providers: [GamesService],
})
export class GamesModule {}
