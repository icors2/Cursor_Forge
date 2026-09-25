/**
 * User directory, ADMIN dues, self-serve theme, ADMIN theme for others.
 * A generic PATCH /users/:id is intentionally absent so isDuesPaid cannot be self-set.
 */

import { Body, Controller, ForbiddenException, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { ROLES, type PublicUser, type Role } from "@volleyball-manager/shared-types";
import { CurrentUser } from "../auth/current-user.decorator";
import type { RequestUser } from "../auth/auth.types";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { ProvisionUserDto, UpdateDuesDto, UpdateRoleDto, UpdateThemeDto } from "./users.dto";
import { UsersService } from "./users.service";

/** Isolated users / dues / theme routes. */
@Controller("users")
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly users: UsersService) {}

  /**
   * ADMIN sees everyone. COACH may list PLAYER rows for the roster dropdown.
   */
  @Get()
  list(@CurrentUser() actor: RequestUser, @Query("role") role?: string): Promise<PublicUser[]> {
    const filtered = role && ROLES.includes(role as Role) ? (role as Role) : undefined;
    if (actor.role === "ADMIN") {
      return this.users.list(filtered);
    }
    if (actor.role === "COACH" && role === "PLAYER") {
      return this.users.list("PLAYER");
    }
    throw new ForbiddenException("Not allowed to list users");
  }

  /** ADMIN provisions an account (dues start unpaid). */
  @Post()
  @Roles("ADMIN")
  provision(@Body() body: ProvisionUserDto): Promise<PublicUser> {
    return this.users.provision(body);
  }

  /** Signed-in user changes their own accent. */
  @Patch("me/theme")
  updateMyTheme(@CurrentUser() actor: RequestUser, @Body() body: UpdateThemeDto): Promise<PublicUser> {
    return this.users.updateTheme(actor.id, body);
  }

  /** ADMIN-only dues toggle. This is the only write path for isDuesPaid. */
  @Patch(":id/dues")
  @Roles("ADMIN")
  updateDues(@Param("id") id: string, @Body() body: UpdateDuesDto): Promise<PublicUser> {
    return this.users.updateDues(id, body);
  }

  /** ADMIN-only role change. Dedicated so a generic user PATCH cannot escalate. */
  @Patch(":id/role")
  @Roles("ADMIN")
  updateRole(@Param("id") id: string, @Body() body: UpdateRoleDto): Promise<PublicUser> {
    return this.users.updateRole(id, body);
  }

  /** ADMIN sets another account's accent. */
  @Patch(":id/theme")
  @Roles("ADMIN")
  updateTheme(@Param("id") id: string, @Body() body: UpdateThemeDto): Promise<PublicUser> {
    return this.users.updateTheme(id, body);
  }
}
