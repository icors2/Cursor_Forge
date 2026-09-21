/**
 * Volunteer HTTP DTOs. Validated at the boundary; times are ISO-8601 UTC.
 */

import { Type } from "class-transformer";
import { IsDateString, IsInt, IsString, MaxLength, Min, MinLength } from "class-validator";

/** POST /volunteer/slots — ADMIN volunteer setup. */
export class CreateVolunteerSlotDto {
  /** Shift label, e.g. Concessions. */
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  title!: string;

  /** Inclusive start instant (UTC). */
  @IsDateString()
  startTime!: string;

  /** Exclusive-or-inclusive end instant (UTC). Must be after startTime (service check). */
  @IsDateString()
  endTime!: string;

  /** Maximum registrations; enforced with a row lock on write. */
  @Type(() => Number)
  @IsInt()
  @Min(1)
  capacity!: number;
}
