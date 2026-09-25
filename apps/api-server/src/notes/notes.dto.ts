/**
 * Coach-note HTTP DTOs. Content is required; playerId must be a user UUID.
 */

import { IsString, Matches, MaxLength, MinLength } from "class-validator";

/** POST /notes — COACH/ADMIN. coachId comes from the JWT. */
export class CreateCoachNoteDto {
  /** Player the note is about. Accepts seed ids that are UUID-shaped but not RFC version 4. */
  @Matches(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/)
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
