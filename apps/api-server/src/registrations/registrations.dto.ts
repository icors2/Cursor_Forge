/**
 * Team registration + player-pool DTOs. Validated at the HTTP boundary.
 */

import { Type } from "class-transformer";
import { IsBoolean, IsEmail, IsIn, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min, MinLength } from "class-validator";
import { ROSTER_POSITIONS, type RosterPosition } from "@volleyball-manager/shared-types";

/** POST /registrations — COACH/ADMIN open (or reopen) a team window. */
export class OpenRegistrationDto {
  /** Active-season team id. Seed demo ids are UUID-shaped, not always RFC v4. */
  @Matches(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/)
  teamId!: string;
}

/** PATCH /registrations/:id. */
export class UpdateRegistrationDto {
  /** Open or close the apply window. */
  @IsBoolean()
  isOpen!: boolean;
}

/** POST /registrations/:id/applications — PARENT/PLAYER apply. */
export class CreateApplicationDto {
  /** Player given name when applying for a child. */
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  playerFirstName?: string;

  /** Player family name when applying for a child. */
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  playerLastName?: string;

  /** Player email (PARENT creating a child; PLAYER defaults to their login). */
  @IsOptional()
  @IsEmail()
  @MaxLength(254)
  playerEmail?: string;

  /** Preferred court position. */
  @IsOptional()
  @IsIn(ROSTER_POSITIONS)
  preferredPosition?: RosterPosition;

  /** Optional note for the coach. */
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

/** POST /registrations/:id/applications/:appId/accept. */
export class AcceptApplicationDto {
  /** Jersey assigned on promote. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(99)
  jerseyNum?: number;

  /** Court position assigned on promote. */
  @IsOptional()
  @IsIn(ROSTER_POSITIONS)
  position?: RosterPosition;
}
