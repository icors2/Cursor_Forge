/**
 * Isolated stats module: HTTP writes + Socket.io fanout.
 */

import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { StatsController } from "./stats.controller";
import { StatsGateway } from "./stats.gateway";
import { StatsService } from "./stats.service";

/** Registers the live-stat feature. */
@Module({
  imports: [AuthModule],
  controllers: [StatsController],
  providers: [StatsService, StatsGateway],
})
export class StatsModule {}
