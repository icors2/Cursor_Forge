/**
 * Isolated team-registration + player-pool plugin.
 */

import { Module } from "@nestjs/common";
import { TeamsModule } from "../teams/teams.module";
import { RegistrationsController } from "./registrations.controller";
import { RegistrationsService } from "./registrations.service";

/** Registers registration HTTP routes. */
@Module({
  imports: [TeamsModule],
  controllers: [RegistrationsController],
  providers: [RegistrationsService],
})
export class RegistrationsModule {}
