/**
 * Season archive DTO. Name/year apply to the NEW empty season.
 */

import { Type } from "class-transformer";
import { IsInt, IsString, Max, MaxLength, Min, MinLength } from "class-validator";

/** POST /seasons/archive — ADMIN. */
export class ArchiveSeasonDto {
  /** Display name for the new season (e.g. Spring 2027). */
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name!: string;

  /** Calendar year for the new season. */
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  @Max(2100)
  year!: number;
}
