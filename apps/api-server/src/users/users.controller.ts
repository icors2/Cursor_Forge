/**
 * ADMIN user directory. Dues and theme each have a dedicated PATCH.
 * A generic PATCH /users/:id is intentionally absent so isDuesPaid cannot be self-set.
 */

import { Body, Controller, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import type { PublicUser } from "@volleyball-manager/shared-types";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { ProvisionUserDto, UpdateDuesDto, UpdateThemeDto } from "./users.dto";
import { UsersService } from "./users.service";

/** Isolated users / dues routes. */
@Controller("users")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("ADMIN")
export class UsersController {
  constructor(private readonly users: UsersService) {}

  /** Directory used by the dues admin table. */
  @Get()
  list(): Promise<PublicUser[]> {
    return this.users.list();
  }

  /** ADMIN provisions an account (dues start unpaid). */
  @Post()
  provision(@Body() body: ProvisionUserDto): Promise<PublicUser> {
    return this.users.provision(body);
  }

  /** ADMIN-only dues toggle. This is the only write path for isDuesPaid. */
  @Patch(":id/dues")
  updateDues(@Param("id") id: string, @Body() body: UpdateDuesDto): Promise<PublicUser> {
    return this.users.updateDues(id, body);
  }

  /** ADMIN-only accent color. This is the only write path for themeColor. */
  @Patch(":id/theme")
  updateTheme(@Param("id") id: string, @Body() body: UpdateThemeDto): Promise<PublicUser> {
    return this.users.updateTheme(id, body);
  }
}
