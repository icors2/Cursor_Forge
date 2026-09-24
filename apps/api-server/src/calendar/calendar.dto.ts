/**
 * ICS import DTOs. Preview does not write games; commit upserts by externalUid.
 */

import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  IsArray,
  IsDateString,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  MaxLength,
  MinLength,
  ValidateNested,
} from "class-validator";

/** POST /calendar/import/preview — COACH/ADMIN. */
export class CalendarPreviewDto {
  /** https ICS URL. */
  @IsOptional()
  @IsUrl({ require_protocol: true, protocols: ["https"] })
  url?: string;

  /** Pasted calendar text (local fixtures / when the feed cannot be fetched). */
  @IsOptional()
  @IsString()
  @MinLength(20)
  @MaxLength(1_000_000)
  icsText?: string;
}

/** One reviewed event on commit. */
export class CalendarCommitEventDto {
  /** ICS UID stored as Game.externalUid. */
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  uid!: string;

  /** Active-season team. */
  @IsUUID()
  teamId!: string;

  /** Opponent label. */
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  opponent!: string;

  /** Kickoff UTC. */
  @IsDateString()
  scheduledAt!: string;
}

/** POST /calendar/import/commit — COACH/ADMIN. */
export class CalendarCommitDto {
  /** Optional URL to remember. */
  @IsOptional()
  @IsUrl({ require_protocol: true, protocols: ["https"] })
  url?: string;

  /** Reviewed rows to upsert. */
  @IsArray()
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => CalendarCommitEventDto)
  events!: CalendarCommitEventDto[];
}
