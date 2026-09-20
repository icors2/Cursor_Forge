/**
 * Shared contracts for Volleyball Manager (web-client + api-server).
 * Keep Prisma enums in packages/database aligned with these values.
 */

/** Club roles used for JWT claims and NestJS RBAC guards. */
export const ROLES = ["ADMIN", "COACH", "PLAYER", "PARENT"] as const;

/** One of the four portal roles from Setup.md. */
export type Role = (typeof ROLES)[number];

/** Live-stat event types. Aggregation happens on read, never via increment. */
export const STAT_TYPES = ["KILL", "ACE", "BLOCK", "DIG", "ERROR"] as const;

/** A single volleyball touch/result recorded as an event row. */
export type StatType = (typeof STAT_TYPES)[number];

/** Public user fields returned by login /me. Never includes passwordHash. */
export interface PublicUser {
  /** Stable user id (uuid). */
  id: string;
  /** Login email (demo seeds use @demo.local). */
  email: string;
  /** RBAC role. */
  role: Role;
  /** Given name. */
  firstName: string;
  /** Family name. */
  lastName: string;
  /** ADMIN-managed dues flag; included so the UI can show status, not edit it. */
  isDuesPaid: boolean;
}

/** POST /auth/login body. */
export interface LoginRequest {
  /** Account email. */
  email: string;
  /** Plain password; never logged. */
  password: string;
}

/** POST /auth/login success body (token is httpOnly cookie, not JSON). */
export interface LoginResponse {
  /** Authenticated public profile. */
  user: PublicUser;
}

/** Roster row nested on a game payload. */
export interface RosterPlayer {
  /** Roster id used when recording a stat. */
  id: string;
  /** Jersey number, if assigned. */
  jerseyNum: number | null;
  /** Player display name. */
  firstName: string;
  /** Player family name. */
  lastName: string;
  /** Linked user id. */
  userId: string;
}

/** Timestamped stat event shown on the live board. */
export interface StatEvent {
  /** Stat row id. */
  id: string;
  /** Parent game id. */
  gameId: string;
  /** Roster id that earned the stat. */
  rosterId: string;
  /** Event type (KILL, ACE, …). */
  type: StatType;
  /** ISO-8601 UTC timestamp. */
  timestamp: string;
  /** Player label for the board. */
  playerName: string;
  /** Jersey for the board. */
  jerseyNum: number | null;
}

/** Game card used by coach pad and parent board. */
export interface GameSummary {
  /** Game id. */
  id: string;
  /** Home team name. */
  teamName: string;
  /** Opponent label. */
  opponent: string;
  /** Kickoff instant in UTC ISO-8601. */
  scheduledAt: string;
  /** Owning season id. */
  seasonId: string;
  /** Season display name. */
  seasonName: string;
  /** Whether this season is the active one. */
  seasonActive: boolean;
}

/** GET /games/:id payload. */
export interface GameDetail extends GameSummary {
  /** Active roster for the home team. */
  roster: RosterPlayer[];
  /** Existing events (newest last for the live list). */
  stats: StatEvent[];
}

/** POST /stats body from the coach pad. */
export interface RecordStatRequest {
  /** Game receiving the event. */
  gameId: string;
  /** Roster row (player on this team). */
  rosterId: string;
  /** Event type allowlist. */
  type: StatType;
}

/** Volunteer shift shown on the signup board. */
export interface VolunteerSlotView {
  /** Slot id. */
  id: string;
  /** Shift label, e.g. Concessions. */
  title: string;
  /** UTC ISO-8601 start. */
  startTime: string;
  /** UTC ISO-8601 end. */
  endTime: string;
  /** Maximum registrations allowed. */
  capacity: number;
  /** Current registration count (read-side, not a stored counter). */
  taken: number;
  /** Owning season id. */
  seasonId: string;
  /** Whether the current user already signed up. */
  registered: boolean;
}

/** ADMIN create-slot body. */
export interface CreateVolunteerSlotRequest {
  /** Shift label. */
  title: string;
  /** UTC ISO-8601 start. */
  startTime: string;
  /** UTC ISO-8601 end. */
  endTime: string;
  /** Maximum signups (>= 1). */
  capacity: number;
}

/** Result of a successful parent registration. */
export interface VolunteerRegistrationView {
  /** Registration id. */
  id: string;
  /** Slot that was claimed. */
  slotId: string;
  /** Parent user id. */
  userId: string;
}
