/**
 * Announcement HTTP DTOs. Validated at the boundary; no authorId from the client.
 */

import { IsDateString, IsOptional, IsString, MaxLength, MinLength, ValidateIf } from "class-validator";

/** POST /announcements — COACH/ADMIN. Author comes from the JWT. */
export class CreateAnnouncementDto {
  /** Headline. */
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  title!: string;

  /** Body text. */
  @IsString()
  @MinLength(2)
  @MaxLength(4000)
  content!: string;

  /** Optional UTC expiry. Empty/null means it does not expire. */
  @IsOptional()
  @ValidateIf((_, value) => value !== null && value !== "")
  @IsDateString()
  expiresAt?: string | null;
}

/** PATCH /announcements/:id — same fields, all optional. */
export class UpdateAnnouncementDto {
  /** Replacement headline. */
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  title?: string;

  /** Replacement body. */
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(4000)
  content?: string;

  /** Replacement UTC expiry, or null to clear. */
  @IsOptional()
  @ValidateIf((_, value) => value !== null && value !== "")
  @IsDateString()
  expiresAt?: string | null;
}
