/**
 * User provision + dues + theme DTOs.
 * isDuesPaid and themeColor each have their own DTO — never a generic user PATCH.
 */

import { IsBoolean, IsEmail, IsIn, IsString, Matches, MaxLength, MinLength } from "class-validator";
import { ROLES, type Role } from "@volleyball-manager/shared-types";

/** POST /users — ADMIN provisions an account. isDuesPaid is always false here. */
export class ProvisionUserDto {
  /** Login email. */
  @IsEmail()
  @MaxLength(254)
  email!: string;

  /** Temporary password; never logged. */
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password!: string;

  /** Given name. */
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  firstName!: string;

  /** Family name. */
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  lastName!: string;

  /** Portal role. */
  @IsIn(ROLES)
  role!: Role;
}

/** PATCH /users/:id/dues — ADMIN only dedicated endpoint. */
export class UpdateDuesDto {
  /** New dues flag. */
  @IsBoolean()
  isDuesPaid!: boolean;
}

/** PATCH /users/:id/role — ADMIN only dedicated endpoint. */
export class UpdateRoleDto {
  /** Replacement portal role. */
  @IsIn(ROLES)
  role!: Role;
}

/** PATCH /users/me/theme or PATCH /users/:id/theme. */
export class UpdateThemeDto {
  /** Accent hex (#rrggbb). Rejects shorthand and non-hex so CSS vars stay safe. */
  @IsString()
  @Matches(/^#[0-9a-fA-F]{6}$/)
  themeColor!: string;
}
