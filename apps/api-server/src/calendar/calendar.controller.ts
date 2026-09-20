/**
 * Public iCal subscribe route so Google Calendar can fetch without a JWT.
 * scheduledAt is UTC; every DATE-TIME is YYYYMMDDThhmmssZ with TZID=UTC on the calendar.
 */

import { Controller, Get, Header, Param } from "@nestjs/common";
import { CalendarService } from "./calendar.service";

/** Isolated calendar HTTP routes. */
@Controller("calendar")
export class CalendarController {
  constructor(private readonly calendar: CalendarService) {}

  /** Dynamic .ics feed for one team (all games on that team). */
  @Get("teams/:teamId/feed.ics")
  @Header("Content-Type", "text/calendar; charset=utf-8")
  @Header("Cache-Control", "no-store")
  feed(@Param("teamId") teamId: string): Promise<string> {
    return this.calendar.buildTeamFeed(teamId);
  }
}
