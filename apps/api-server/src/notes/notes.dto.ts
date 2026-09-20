/**
 * Coach-note HTTP DTOs. Content is required; playerId must be a user UUID.
 */

import { IsString, IsUUID, MaxLength, MinLength } from "class-validator";

/** POST /notes — COACH/ADMIN. coachId comes from the JWT. */
export class CreateCoachNoteDto {
  /** Player the note is about. */
  @IsUUID()
  playerId!: string;

  /** Observation body. Never logged. */
  @IsString()
  @MinLength(2)
  @MaxLength(4000)
  content!: string;
}

/** PATCH /notes/:id — replacement body only. */
export class UpdateCoachNoteDto {
  /** Replacement observation body. */
  @IsString()
  @MinLength(2)
  @MaxLength(4000)
  content!: string;
}
