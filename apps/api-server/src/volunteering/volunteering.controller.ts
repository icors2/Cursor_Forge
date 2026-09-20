/**
 * Volunteer HTTP API.
 * ADMIN creates slots (Setup.md volunteer setup). PARENT registers. Any auth role may list.
 */

import { Body, Controller, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
import type { VolunteerRegistrationView, VolunteerSlotView } from "@volleyball-manager/shared-types";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import type { RequestUser } from "../auth/auth.types";
import { CreateVolunteerSlotDto } from "./volunteering.dto";
import { VolunteeringService } from "./volunteering.service";

/** Isolated volunteering routes. */
@Controller("volunteer")
@UseGuards(JwtAuthGuard, RolesGuard)
export class VolunteeringController {
  constructor(private readonly volunteering: VolunteeringService) {}

  /** Lists active-season slots (historical with explicit query flags). */
  @Get("slots")
  list(
    @CurrentUser() user: RequestUser,
    @Query("historical") historical?: string,
    @Query("seasonId") seasonId?: string,
  ): Promise<VolunteerSlotView[]> {
    return this.volunteering.list(user.id, historical, seasonId);
  }

  /** ADMIN volunteer setup — creates a slot on the active season. */
  @Post("slots")
  @Roles("ADMIN")
  create(@Body() body: CreateVolunteerSlotDto): Promise<VolunteerSlotView> {
    return this.volunteering.createSlot(body);
  }

  /** PARENT claims one seat. Transaction + row lock; 409 when full or already signed up. */
  @Post("slots/:id/registrations")
  @Roles("PARENT")
  register(
    @Param("id") slotId: string,
    @CurrentUser() user: RequestUser,
  ): Promise<VolunteerRegistrationView> {
    return this.volunteering.register(slotId, user.id);
  }
}
