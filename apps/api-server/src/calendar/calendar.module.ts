/**
 * Isolated iCal plugin. Reads Game.scheduledAt only — no volunteer or stats writes.
 */

import { Module } from "@nestjs/common";
import { CalendarController } from "./calendar.controller";
import { CalendarService } from "./calendar.service";

/** Registers the public calendar feed. */
@Module({
  controllers: [CalendarController],
  providers: [CalendarService],
})
export class CalendarModule {}
