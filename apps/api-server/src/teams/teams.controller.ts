/**
 * Team + roster HTTP API. Reads are any auth role; writes are ADMIN/COACH.
 */

import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import type { CreateRosterResult, RosterPlayer, TeamView } from "@volleyball-manager/shared-types";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { CreateRosterDto, CreateTeamDto, UpdateRosterDto } from "./teams.dto";
import { TeamsService } from "./teams.service";

/** Isolated team routes. */
@Controller("teams")
@UseGuards(JwtAuthGuard, RolesGuard)
export class TeamsController {
  constructor(private readonly teams: TeamsService) {}

  /** Lists teams in the active season (or historical if flagged). */
  @Get()
  list(@Query("historical") historical?: string, @Query("seasonId") seasonId?: string): Promise<TeamView[]> {
    return this.teams.list(historical, seasonId);
  }

  /** ADMIN/COACH create a team on the active season. */
  @Post()
  @Roles("ADMIN", "COACH")
  create(@Body() body: CreateTeamDto): Promise<TeamView> {
    return this.teams.create(body);
  }

  /** Team detail + roster for the resolved season. */
  @Get(":id")
  getById(
    @Param("id") id: string,
    @Query("historical") historical?: string,
    @Query("seasonId") seasonId?: string,
  ): Promise<TeamView & { roster: RosterPlayer[] }> {
    return this.teams.getById(id, historical, seasonId);
  }

  /** ADMIN/COACH add a PLAYER (existing or newly created, dues not required). */
  @Post(":id/roster")
  @Roles("ADMIN", "COACH")
  addRoster(@Param("id") id: string, @Body() body: CreateRosterDto): Promise<CreateRosterResult> {
    return this.teams.addRoster(id, body);
  }

  /** ADMIN/COACH set jersey and/or court position. */
  @Patch(":id/roster/:rosterId")
  @Roles("ADMIN", "COACH")
  updateRoster(
    @Param("id") id: string,
    @Param("rosterId") rosterId: string,
    @Body() body: UpdateRosterDto,
  ): Promise<RosterPlayer> {
    return this.teams.updateRoster(id, rosterId, body);
  }
}
