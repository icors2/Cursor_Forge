/**
 * Root module — wires Prisma, season context, auth, games, and live stats.
 */

import { Module } from "@nestjs/common";
import { AuthModule } from "./auth/auth.module";
import { CommonModule } from "./common/common.module";
import { GamesModule } from "./games/games.module";
import { HealthController } from "./health.controller";
import { PrismaModule } from "./prisma/prisma.module";
import { StatsModule } from "./stats/stats.module";

/** Application composition root. */
@Module({
  imports: [PrismaModule, CommonModule, AuthModule, GamesModule, StatsModule],
  controllers: [HealthController],
})
export class AppModule {}
