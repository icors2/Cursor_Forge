/**
 * Stat write DTO. Type is allowlisted to the StatType enum.
 */

import { STAT_TYPES, type StatType } from "@volleyball-manager/shared-types";
import { IsIn, IsUUID } from "class-validator";

/** POST /stats body from the coach pad. */
export class RecordStatDto {
  /** Game receiving the event. */
  @IsUUID()
  gameId!: string;

  /** Roster row (must belong to the game's team). */
  @IsUUID()
  rosterId!: string;

  /** Event type — never a numeric increment. */
  @IsIn(STAT_TYPES)
  type!: StatType;
}
