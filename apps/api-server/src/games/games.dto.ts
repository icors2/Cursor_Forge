/**
 * Game write DTO. scheduledAt must be a UTC ISO-8601 instant.
 */

import { IsDateString, IsString, IsUUID, MaxLength, MinLength } from "class-validator";

/** POST /games — COACH/ADMIN. seasonId is taken from the active season, not the body. */
export class CreateGameDto {
  /** Home team (must belong to the active season). */
  @IsUUID()
  teamId!: string;

  /** Opponent label. */
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  opponent!: string;

  /** Kickoff instant in UTC. */
  @IsDateString()
  scheduledAt!: string;
}
