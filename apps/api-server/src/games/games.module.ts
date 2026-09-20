/**
 * Isolated games read module (no writes in the first slice).
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
