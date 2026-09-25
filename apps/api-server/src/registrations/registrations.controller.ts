/**
 * Team registration HTTP API. COACH/ADMIN open windows; PARENT/PLAYER apply;
 * staff promote the pool onto the roster.
 */

import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import type { CreateRosterResult, TeamApplicationView, TeamRegistrationView } from "@volleyball-manager/shared-types";
import { CurrentUser } from "../auth/current-user.decorator";
import type { RequestUser } from "../auth/auth.types";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { AcceptApplicationDto, CreateApplicationDto, OpenRegistrationDto, UpdateRegistrationDto } from "./registrations.dto";
import { RegistrationsService } from "./registrations.service";

/** Isolated registration routes. */
@Controller("registrations")
@UseGuards(JwtAuthGuard, RolesGuard)
export class RegistrationsController {
  constructor(private readonly registrations: RegistrationsService) {}

  /** Active-season windows. Applicants only see open ones. */
  @Get()
  list(@CurrentUser() actor: RequestUser, @Query("open") open?: string): Promise<TeamRegistrationView[]> {
    return this.registrations.list(actor, open === "true");
  }

  /** COACH/ADMIN open or reopen a team window. */
  @Post()
  @Roles("ADMIN", "COACH")
  open(@CurrentUser() actor: RequestUser, @Body() body: OpenRegistrationDto): Promise<TeamRegistrationView> {
    return this.registrations.open(actor, body);
  }

  /** Window detail + pool (staff) or the caller's own application. */
  @Get(":id")
  getById(
    @Param("id") id: string,
    @CurrentUser() actor: RequestUser,
  ): Promise<TeamRegistrationView & { applications: TeamApplicationView[] }> {
    return this.registrations.getById(id, actor);
  }

  /** COACH/ADMIN close or reopen. */
  @Patch(":id")
  @Roles("ADMIN", "COACH")
  update(@Param("id") id: string, @Body() body: UpdateRegistrationDto): Promise<TeamRegistrationView> {
    return this.registrations.update(id, body);
  }

  /** PARENT/PLAYER apply to an open window. */
  @Post(":id/applications")
  @Roles("PARENT", "PLAYER")
  apply(
    @Param("id") id: string,
    @CurrentUser() actor: RequestUser,
    @Body() body: CreateApplicationDto,
  ): Promise<TeamApplicationView> {
    return this.registrations.apply(id, actor, body);
  }

  /** COACH/ADMIN promote a pending application onto the roster. */
  @Post(":id/applications/:appId/accept")
  @Roles("ADMIN", "COACH")
  accept(
    @Param("id") id: string,
    @Param("appId") appId: string,
    @Body() body: AcceptApplicationDto,
  ): Promise<{ application: TeamApplicationView; roster: CreateRosterResult }> {
    return this.registrations.accept(id, appId, body);
  }

  /** COACH/ADMIN decline a pending application. */
  @Post(":id/applications/:appId/decline")
  @Roles("ADMIN", "COACH")
  decline(@Param("id") id: string, @Param("appId") appId: string): Promise<TeamApplicationView> {
    return this.registrations.decline(id, appId);
  }
}
