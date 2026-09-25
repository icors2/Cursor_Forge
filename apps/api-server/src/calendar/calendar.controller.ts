/**
 * Public per-team iCal export plus COACH/ADMIN multi-team ICS import.
 */

import { Body, Controller, Get, Header, Param, Post, UseGuards } from "@nestjs/common";
import type {
  CalendarImportCommitResult,
  CalendarImportPreview,
  CalendarSubscriptionView,
} from "@volleyball-manager/shared-types";
import { CurrentUser } from "../auth/current-user.decorator";
import type { RequestUser } from "../auth/auth.types";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { CalendarCommitDto, CalendarPreviewDto } from "./calendar.dto";
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

  /** Last remembered club ICS URL. */
  @Get("subscription")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("COACH", "ADMIN")
  subscription(): Promise<CalendarSubscriptionView> {
    return this.calendar.lastSubscription();
  }

  /** Preview only — no Game writes. */
  @Post("import/preview")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("COACH", "ADMIN")
  preview(@Body() body: CalendarPreviewDto): Promise<CalendarImportPreview> {
    return this.calendar.preview(body);
  }

  /** Upsert reviewed events as Game rows. */
  @Post("import/commit")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("COACH", "ADMIN")
  commit(@CurrentUser() user: RequestUser, @Body() body: CalendarCommitDto): Promise<CalendarImportCommitResult> {
    return this.calendar.commit(user, body);
  }
}
