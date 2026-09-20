/**
 * Isolated volunteering plugin. Does not import games or stats internals.
 */

import { Module } from "@nestjs/common";
import { VolunteeringController } from "./volunteering.controller";
import { VolunteeringService } from "./volunteering.service";

/** Registers volunteer HTTP routes. */
@Module({
  controllers: [VolunteeringController],
  providers: [VolunteeringService],
})
export class VolunteeringModule {}
