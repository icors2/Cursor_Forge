/**
 * Announcement board HTTP API.
 * Any authenticated role may read. COACH/ADMIN write.
 */

import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import type { AnnouncementView } from "@volleyball-manager/shared-types";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import type { RequestUser } from "../auth/auth.types";
import { CreateAnnouncementDto, UpdateAnnouncementDto } from "./announcements.dto";
import { AnnouncementsService } from "./announcements.service";

/** Isolated announcement routes. */
@Controller("announcements")
@UseGuards(JwtAuthGuard, RolesGuard)
export class AnnouncementsController {
  constructor(private readonly announcements: AnnouncementsService) {}

  /** Lists current announcements. Staff can pass includeExpired=true. */
  @Get()
  list(
    @CurrentUser() user: RequestUser,
    @Query("includeExpired") includeExpired?: string,
  ): Promise<AnnouncementView[]> {
    const staff = user.role === "ADMIN" || user.role === "COACH";
    return this.announcements.list(staff && includeExpired === "true");
  }

  /** COACH/ADMIN create. */
  @Post()
  @Roles("COACH", "ADMIN")
  create(@CurrentUser() user: RequestUser, @Body() body: CreateAnnouncementDto): Promise<AnnouncementView> {
    return this.announcements.create(user, body);
  }

  /** Author or ADMIN update. */
  @Patch(":id")
  @Roles("COACH", "ADMIN")
  update(
    @CurrentUser() user: RequestUser,
    @Param("id") id: string,
    @Body() body: UpdateAnnouncementDto,
  ): Promise<AnnouncementView> {
    return this.announcements.update(user, id, body);
  }

  /** Author or ADMIN delete. */
  @Delete(":id")
  @Roles("COACH", "ADMIN")
  remove(@CurrentUser() user: RequestUser, @Param("id") id: string): Promise<{ ok: true }> {
    return this.announcements.remove(user, id);
  }
}
