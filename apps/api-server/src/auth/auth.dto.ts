/**
 * Auth request DTOs. Validated at the HTTP boundary.
 */

import { IsEmail, IsIn, IsOptional, IsString, MaxLength, MinLength, ValidateIf } from "class-validator";
import { REGISTER_ROLES, type RegisterRole } from "@volleyball-manager/shared-types";

/** POST /auth/login body. */
export class LoginDto {
  /** Account email. */
  @IsEmail()
  @MaxLength(254)
  email!: string;

  /** Plain password; never logged. */
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password!: string;
}

/** POST /auth/register — PARENT/PLAYER, or COACH when a one-time invite key is present. */
export class RegisterDto {
  /** Login email. */
  @IsEmail()
  @MaxLength(254)
  email!: string;

  /** Plain password; never logged. */
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

  /** Never ADMIN. COACH requires coachKey. */
  @IsIn(REGISTER_ROLES)
  role!: RegisterRole;

  /** One-time invite from an ADMIN. Required when role is COACH. */
  @ValidateIf((body: RegisterDto) => body.role === "COACH")
  @IsString()
  @MinLength(20)
  @MaxLength(128)
  coachKey?: string;
}

/** POST /auth/coach-keys — ADMIN generate. */
export class CreateCoachInviteKeyDto {
  /** Optional note shown in the admin list. */
  @IsOptional()
  @IsString()
  @MaxLength(80)
  label?: string;
}
