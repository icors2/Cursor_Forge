/**
 * Team + roster HTTP API. Reads are any auth role; writes are ADMIN/COACH.
 */

import { Body, Controller, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
import type { RosterPlayer, TeamView } from "@volleyball-manager/shared-types";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { CreateRosterDto, CreateTeamDto } from "./teams.dto";
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

  /** ADMIN/COACH add a dues-paid PLAYER to the active-season team. */
  @Post(":id/roster")
  @Roles("ADMIN", "COACH")
  addRoster(@Param("id") id: string, @Body() body: CreateRosterDto): Promise<RosterPlayer> {
    return this.teams.addRoster(id, body);
  }
}
