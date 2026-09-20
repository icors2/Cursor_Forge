/**
 * User provision + dues DTOs. isDuesPaid is only on UpdateDuesDto — never on provision.
 */

import { IsBoolean, IsEmail, IsIn, IsString, MaxLength, MinLength } from "class-validator";
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
