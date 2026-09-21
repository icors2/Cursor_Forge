/**
 * Team and roster write DTOs. Teams always attach to the active season in the service.
 */

import { Type } from "class-transformer";
import { IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min, MinLength } from "class-validator";

/** POST /teams — ADMIN/COACH. */
export class CreateTeamDto {
  /** Team display name. */
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name!: string;
}

/** POST /teams/:id/roster — ADMIN/COACH. */
export class CreateRosterDto {
  /** Player user id to assign. UUID-shaped (seed demo ids may not be RFC v4). */
  @Matches(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/)
  userId!: string;

  /** Optional jersey number. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(99)
  jerseyNum?: number;
}
