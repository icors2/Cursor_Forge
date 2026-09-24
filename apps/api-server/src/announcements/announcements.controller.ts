/**
 * Announcement board HTTP API.
 * Any authenticated role may read. COACH/ADMIN write.
 */

import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import type { AnnouncementCommentView, AnnouncementView } from "@volleyball-manager/shared-types";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import type { RequestUser } from "../auth/auth.types";
import { CreateAnnouncementDto, CreateCommentDto, MuteCommenterDto, UpdateAnnouncementDto } from "./announcements.dto";
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

  /** COACH/ADMIN mute a commenter. */
  @Post("mutes")
  @Roles("COACH", "ADMIN")
  mute(@CurrentUser() user: RequestUser, @Body() body: MuteCommenterDto): Promise<{ ok: true }> {
    return this.announcements.mute(user, body.userId);
  }

  /** COACH/ADMIN unmute. */
  @Delete("mutes/:userId")
  @Roles("COACH", "ADMIN")
  unmute(@Param("userId") userId: string): Promise<{ ok: true }> {
    return this.announcements.unmute(userId);
  }

  /** Comments on one post. */
  @Get(":id/comments")
  listComments(@Param("id") id: string): Promise<AnnouncementCommentView[]> {
    return this.announcements.listComments(id);
  }

  /** Authenticated comment unless muted. */
  @Post(":id/comments")
  addComment(
    @CurrentUser() user: RequestUser,
    @Param("id") id: string,
    @Body() body: CreateCommentDto,
  ): Promise<AnnouncementCommentView> {
    return this.announcements.addComment(user, id, body);
  }

  /** Author or staff delete. */
  @Delete(":id/comments/:commentId")
  removeComment(
    @CurrentUser() user: RequestUser,
    @Param("id") id: string,
    @Param("commentId") commentId: string,
  ): Promise<{ ok: true }> {
    return this.announcements.removeComment(user, id, commentId);
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
