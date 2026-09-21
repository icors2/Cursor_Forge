/**
 * Coach notes HTTP API. COACH/ADMIN only — notes are not a parent/player surface.
 */

import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import type { CoachNoteView } from "@volleyball-manager/shared-types";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import type { RequestUser } from "../auth/auth.types";
import { CreateCoachNoteDto, UpdateCoachNoteDto } from "./notes.dto";
import { NotesService } from "./notes.service";

/** Isolated coach-notes routes. */
@Controller("notes")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("COACH", "ADMIN")
export class NotesController {
  constructor(private readonly notes: NotesService) {}

  /** Lists notes (optional playerId filter). */
  @Get()
  list(@Query("playerId") playerId?: string): Promise<CoachNoteView[]> {
    return this.notes.list(playerId);
  }

  /** Creates a note authored by the current coach/admin. */
  @Post()
  create(@CurrentUser() user: RequestUser, @Body() body: CreateCoachNoteDto): Promise<CoachNoteView> {
    return this.notes.create(user, body);
  }

  /** Replaces note content. */
  @Patch(":id")
  update(
    @CurrentUser() user: RequestUser,
    @Param("id") id: string,
    @Body() body: UpdateCoachNoteDto,
  ): Promise<CoachNoteView> {
    return this.notes.update(user, id, body);
  }

  /** Deletes a note. */
  @Delete(":id")
  remove(@CurrentUser() user: RequestUser, @Param("id") id: string): Promise<{ ok: true }> {
    return this.notes.remove(user, id);
  }
}
