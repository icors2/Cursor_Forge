/**
 * Team and roster write DTOs. Teams always attach to the active season in the service.
 */

import { Type } from "class-transformer";
import { IsEmail, IsIn, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min, MinLength, ValidateIf } from "class-validator";
import { ROSTER_POSITIONS, type RosterPosition } from "@volleyball-manager/shared-types";

/** POST /teams — ADMIN/COACH. */
export class CreateTeamDto {
  /** Team display name. */
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name!: string;
}

/** POST /teams/:id/roster — ADMIN/COACH. Existing userId or a new PLAYER identity. */
export class CreateRosterDto {
  /** Existing PLAYER user id. UUID-shaped (seed demo ids may not be RFC v4). */
  @IsOptional()
  @ValidateIf((_, value) => value !== undefined && value !== "")
  @Matches(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/)
  userId?: string;

  /** New player email when creating an unpaid PLAYER. */
  @IsOptional()
  @IsEmail()
  @MaxLength(254)
  email?: string;

  /** New player given name. */
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  firstName?: string;

  /** New player family name. */
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  lastName?: string;

  /** Optional jersey number. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(99)
  jerseyNum?: number;

  /** Optional court position. */
  @IsOptional()
  @IsIn(ROSTER_POSITIONS)
  position?: RosterPosition;
}

/** PATCH /teams/:id/roster/:rosterId. */
export class UpdateRosterDto {
  /** Replacement jersey. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(99)
  jerseyNum?: number | null;

  /** Replacement court position. */
  @IsOptional()
  @IsIn(ROSTER_POSITIONS)
  position?: RosterPosition | null;
}
