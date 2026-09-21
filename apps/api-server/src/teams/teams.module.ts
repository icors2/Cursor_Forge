/**
 * Isolated teams + roster plugin.
 */

import { Module } from "@nestjs/common";
import { TeamsController } from "./teams.controller";
import { TeamsService } from "./teams.service";

/** Registers team HTTP routes. */
@Module({
  controllers: [TeamsController],
  providers: [TeamsService],
})
export class TeamsModule {}
