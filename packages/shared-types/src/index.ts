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

/** Default accent when a user has no custom theme (court-400 brand green). */
export const DEFAULT_THEME_COLOR = "#3dcf8e";

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
  /** ADMIN-assigned accent hex (#rrggbb) applied as CSS --theme for this account. */
  themeColor: string;
}

/** PATCH /users/:id/theme — ADMIN only. Never accepted on a generic user update. */
export interface UpdateThemeRequest {
  /** Accent hex including the leading #. */
  themeColor: string;
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

/** Season row for list + archive UI. */
export interface SeasonView {
  /** Season id. */
  id: string;
  /** Calendar year (e.g. 2026). */
  year: number;
  /** Display name (e.g. Fall 2026). */
  name: string;
  /** Exactly one season should be active. */
  isActive: boolean;
}

/** POST /seasons/archive — name/year of the NEW empty season. */
export interface ArchiveSeasonRequest {
  /** New season display name. */
  name: string;
  /** New season year. */
  year: number;
}

/** archiveSeason result: previous season frozen, new empty season active. */
export interface ArchiveSeasonResult {
  /** Season that was set isActive=false. */
  archived: SeasonView;
  /** Newly created empty season (isActive=true). */
  created: SeasonView;
}

/** Team card for roster/calendar pages. */
export interface TeamView {
  /** Team id. */
  id: string;
  /** Team display name. */
  name: string;
  /** Owning season. */
  seasonId: string;
  /** Season display name. */
  seasonName: string;
  /** Whether this season is the active one. */
  seasonActive: boolean;
  /** Roster size (read-side count). */
  rosterCount: number;
}

/** POST /teams body — always attached to the active season. */
export interface CreateTeamRequest {
  /** Team display name. */
  name: string;
}

/** POST /teams/:id/roster body. */
export interface CreateRosterRequest {
  /** Player user id to assign. */
  userId: string;
  /** Optional jersey number. */
  jerseyNum?: number | null;
}

/** POST /games body — scheduledAt must be a UTC instant. */
export interface CreateGameRequest {
  /** Home team (must belong to the active season). */
  teamId: string;
  /** Opponent label. */
  opponent: string;
  /** Kickoff instant in UTC ISO-8601. */
  scheduledAt: string;
}

/** Club announcement shown on the board. */
export interface AnnouncementView {
  /** Announcement id. */
  id: string;
  /** Headline. */
  title: string;
  /** Body text. */
  content: string;
  /** Author user id. */
  authorId: string;
  /** Author display name. */
  authorName: string;
  /** Created instant UTC ISO-8601. */
  createdAt: string;
  /** Optional expiry instant UTC ISO-8601. */
  expiresAt: string | null;
}

/** POST /announcements body. */
export interface CreateAnnouncementRequest {
  /** Headline. */
  title: string;
  /** Body text. */
  content: string;
  /** Optional UTC expiry. */
  expiresAt?: string | null;
}

/** Private coach note about a player. */
export interface CoachNoteView {
  /** Note id. */
  id: string;
  /** Player user id. */
  playerId: string;
  /** Player display name. */
  playerName: string;
  /** Author coach/admin id. */
  coachId: string;
  /** Author display name. */
  coachName: string;
  /** Note body. */
  content: string;
  /** Created instant UTC ISO-8601. */
  createdAt: string;
}

/** POST /notes body. */
export interface CreateCoachNoteRequest {
  /** Player user id the note is about. */
  playerId: string;
  /** Note body. */
  content: string;
}

/** PATCH /users/:id/dues — ADMIN only. Never accepted on a generic user update. */
export interface UpdateDuesRequest {
  /** New dues flag. */
  isDuesPaid: boolean;
}

/** ADMIN-provisioned account (not public self-serve signup). */
export interface ProvisionUserRequest {
  /** Login email. */
  email: string;
  /** Temporary password; never logged. */
  password: string;
  /** Given name. */
  firstName: string;
  /** Family name. */
  lastName: string;
  /** Portal role. */
  role: Role;
}
