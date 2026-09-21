/**
 * Cross-cutting providers used by games and stats (active season resolver).
 */

import { Global, Module } from "@nestjs/common";
import { ActiveSeasonService } from "./active-season.service";

/** Global so feature modules can inject ActiveSeasonService. */
@Global()
@Module({
  providers: [ActiveSeasonService],
  exports: [ActiveSeasonService],
})
export class CommonModule {}
