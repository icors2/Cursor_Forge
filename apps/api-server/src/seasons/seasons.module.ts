/**
 * Isolated seasons plugin (list + archiveSeason).
 */

import { Module } from "@nestjs/common";
import { SeasonsController } from "./seasons.controller";
import { SeasonsService } from "./seasons.service";

/** Registers season HTTP routes. */
@Module({
  controllers: [SeasonsController],
  providers: [SeasonsService],
})
export class SeasonsModule {}
