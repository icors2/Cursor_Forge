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

/** Court positions a coach can assign on the roster. */
export const ROSTER_POSITIONS = ["OH", "MB", "S", "L", "OPP", "DS"] as const;

/** One volleyball court position. */
export type RosterPosition = (typeof ROSTER_POSITIONS)[number];

/** Human labels for roster positions. */
export const ROSTER_POSITION_LABELS: Record<RosterPosition, string> = {
  OH: "Outside Hitter",
  MB: "Middle Blocker",
  S: "Setter",
  L: "Libero",
  OPP: "Opposite",
  DS: "Defensive Specialist",
};

/** Player-pool application lifecycle. */
export const APPLICATION_STATUSES = ["PENDING", "ACCEPTED", "DECLINED"] as const;

/** Status of one team application. */
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

/** Roles that public self-serve signup may choose without a coach key. */
export const PUBLIC_REGISTER_ROLES = ["PARENT", "PLAYER"] as const;

/** Role allowed on POST /auth/register without a coach key. */
export type PublicRegisterRole = (typeof PUBLIC_REGISTER_ROLES)[number];

/** Roles accepted on POST /auth/register. COACH requires a one-time invite key. */
export const REGISTER_ROLES = ["PARENT", "PLAYER", "COACH"] as const;

/** Role allowed on POST /auth/register (COACH needs coachKey). */
export type RegisterRole = (typeof REGISTER_ROLES)[number];

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
  /** Accent hex (#rrggbb) applied as CSS --theme for this account. */
  themeColor: string;
}

/** PATCH /users/me/theme (self) or PATCH /users/:id/theme (ADMIN). Never accepted on a generic user update. */
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
  /** Court position, if the coach set one. */
  position: RosterPosition | null;
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
  /** Home team id (needed to edit mapping after ICS import). */
  teamId: string;
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

/** POST /teams/:id/roster body. Supply userId or a new PLAYER (email + names). */
export interface CreateRosterRequest {
  /** Existing PLAYER user id to assign. */
  userId?: string;
  /** New player login email (creates an unpaid PLAYER). */
  email?: string;
  /** New player given name. */
  firstName?: string;
  /** New player family name. */
  lastName?: string;
  /** Optional jersey number. */
  jerseyNum?: number | null;
  /** Optional court position. */
  position?: RosterPosition | null;
}

/** PATCH /teams/:id/roster/:rosterId — jersey and/or position. */
export interface UpdateRosterRequest {
  /** Replacement jersey. */
  jerseyNum?: number | null;
  /** Replacement court position. */
  position?: RosterPosition | null;
}

/** POST /auth/register — PARENT/PLAYER, or COACH with a one-time invite key. */
export interface RegisterRequest {
  /** Login email. */
  email: string;
  /** Plain password; never logged. */
  password: string;
  /** Given name. */
  firstName: string;
  /** Family name. */
  lastName: string;
  /** PARENT/PLAYER freely; COACH only with coachKey. Never ADMIN. */
  role: RegisterRole;
  /** One-time invite shown once by an ADMIN. Required when role is COACH. */
  coachKey?: string;
}

/** POST /auth/coach-keys — ADMIN generates a one-time coach signup key. */
export interface CreateCoachInviteKeyRequest {
  /** Optional note shown in the admin list (not secret). */
  label?: string;
}

/** Response from POST /auth/coach-keys. `key` is plaintext and is never stored. */
export interface CreatedCoachInviteKey {
  /** Invite row id. */
  id: string;
  /** Plaintext key shown once. Copy it; it cannot be retrieved again. */
  key: string;
  /** Optional admin note. */
  label: string | null;
  /** When the key was generated. */
  createdAt: string;
}

/** GET /auth/coach-keys item. Never includes keyHash or plaintext. */
export interface CoachInviteKeyView {
  /** Invite row id. */
  id: string;
  /** Optional admin note. */
  label: string | null;
  /** When the key was generated. */
  createdAt: string;
  /** When a coach redeemed it, or null if still unused. */
  usedAt: string | null;
  /** User who redeemed it, or null if unused. */
  usedById: string | null;
}

/** PATCH /users/:id/role — ADMIN only dedicated endpoint. */
export interface UpdateRoleRequest {
  /** Replacement portal role. */
  role: Role;
}

/** Coach-opened apply window for one team. */
export interface TeamRegistrationView {
  /** Registration id. */
  id: string;
  /** Team being applied to. */
  teamId: string;
  /** Team display name. */
  teamName: string;
  /** Owning season. */
  seasonId: string;
  /** Season display name. */
  seasonName: string;
  /** Whether parents/players may still apply. */
  isOpen: boolean;
  /** Coach/admin who opened the window. */
  openedById: string;
  /** Created instant UTC ISO-8601. */
  createdAt: string;
  /** Pending + decided applications (staff only; empty for applicants). */
  applicationCount: number;
}

/** One row in the player pool. */
export interface TeamApplicationView {
  /** Application id. */
  id: string;
  /** Parent registration window. */
  registrationId: string;
  /** Account that submitted the apply. */
  applicantId: string;
  /** Applicant display name. */
  applicantName: string;
  /** Applicant role. */
  applicantRole: Role;
  /** Player given name offered for the roster. */
  playerFirstName: string;
  /** Player family name offered for the roster. */
  playerLastName: string;
  /** Player email used on accept (create or match). */
  playerEmail: string;
  /** Existing PLAYER id when known. */
  playerUserId: string | null;
  /** Applicant's preferred court position. */
  preferredPosition: RosterPosition | null;
  /** Optional note from the applicant. */
  note: string | null;
  /** Pool status. */
  status: ApplicationStatus;
  /** Created instant UTC ISO-8601. */
  createdAt: string;
}

/** POST /registrations body. */
export interface OpenRegistrationRequest {
  /** Active-season team to open. */
  teamId: string;
}

/** PATCH /registrations/:id body. */
export interface UpdateRegistrationRequest {
  /** Open or close the apply window. */
  isOpen: boolean;
}

/** POST /registrations/:id/applications body. */
export interface CreateApplicationRequest {
  /** Player given name (defaults to the applicant). */
  playerFirstName?: string;
  /** Player family name (defaults to the applicant). */
  playerLastName?: string;
  /** Player email (required for PARENT; PLAYER uses their login). */
  playerEmail?: string;
  /** Preferred court position. */
  preferredPosition?: RosterPosition | null;
  /** Optional note for the coach. */
  note?: string;
}

/** POST /registrations/:id/applications/:appId/accept body. */
export interface AcceptApplicationRequest {
  /** Jersey assigned on promote. */
  jerseyNum?: number | null;
  /** Court position assigned on promote (falls back to preferred). */
  position?: RosterPosition | null;
}

/** Remembered club ICS URL, if any. */
export interface CalendarSubscriptionView {
  /** Subscription row id, or null when none is stored. */
  id: string | null;
  /** Last imported https URL, or null. */
  url: string | null;
  /** Who saved it. */
  createdById: string | null;
  /** Saved instant UTC ISO-8601. */
  createdAt: string | null;
}

/** Roster add result. temporaryPassword is only set when a new account was created. */
export interface CreateRosterResult extends RosterPlayer {
  /** One-time password for a newly provisioned player; never stored in plaintext. */
  temporaryPassword?: string;
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

/** PATCH /games/:id — COACH/ADMIN correct team/opponent/kickoff on the active season. */
export interface UpdateGameRequest {
  /** Replacement home team (active season). */
  teamId?: string;
  /** Replacement opponent label. */
  opponent?: string;
  /** Replacement kickoff UTC ISO-8601. */
  scheduledAt?: string;
}

/** One comment under a news post. */
export interface AnnouncementCommentView {
  /** Comment id. */
  id: string;
  /** Parent announcement id. */
  announcementId: string;
  /** Author user id. */
  authorId: string;
  /** Author display name. */
  authorName: string;
  /** Comment body. */
  content: string;
  /** Created instant UTC ISO-8601. */
  createdAt: string;
}

/** POST /announcements/:id/comments body. */
export interface CreateCommentRequest {
  /** Comment body. */
  content: string;
}

/** POST /announcements/mutes body. */
export interface MuteCommenterRequest {
  /** User id to block from commenting. */
  userId: string;
}

/** Preview row from a multi-team ICS feed. */
export interface CalendarImportEvent {
  /** ICS UID (used as Game.externalUid). */
  uid: string;
  /** Kickoff UTC ISO-8601 when parse succeeded. */
  scheduledAt: string | null;
  /** Raw SUMMARY for the review table. */
  summary: string;
  /** Best-guess active-season team id. */
  suggestedTeamId: string | null;
  /** Best-guess opponent label. */
  suggestedOpponent: string;
  /** True when team or kickoff could not be inferred. */
  unmatched: boolean;
}

/** POST /calendar/import/preview body. Provide url and/or pasted icsText. */
export interface CalendarImportPreviewRequest {
  /** https ICS URL (server-fetched). */
  url?: string;
  /** Pasted calendar text for local/smoke fixtures. */
  icsText?: string;
}

/** POST /calendar/import/preview result. */
export interface CalendarImportPreview {
  /** Source URL when one was stored/used. */
  url: string | null;
  /** Parsed events ready for coach/admin review. */
  events: CalendarImportEvent[];
}

/** One reviewed row sent to commit. */
export interface CalendarImportCommitEvent {
  /** ICS UID. */
  uid: string;
  /** Home team id (active season). */
  teamId: string;
  /** Opponent label. */
  opponent: string;
  /** Kickoff UTC ISO-8601. */
  scheduledAt: string;
}

/** POST /calendar/import/commit body. */
export interface CalendarImportCommitRequest {
  /** Optional URL to remember as the club subscription. */
  url?: string;
  /** Reviewed events to upsert as Game rows. */
  events: CalendarImportCommitEvent[];
}

/** POST /calendar/import/commit result. */
export interface CalendarImportCommitResult {
  /** Games created or updated. */
  games: GameSummary[];
  /** Rows skipped for missing fields. */
  skipped: number;
}

/** Per-player season totals for printable history. */
export interface SeasonPlayerTotals {
  /** Player user id. */
  userId: string;
  /** Display name. */
  playerName: string;
  /** Jersey when known. */
  jerseyNum: number | null;
  /** Event counts for the season. */
  totals: Record<StatType, number>;
}

/** GET /seasons/:id/history — games plus player rollups. */
export interface SeasonHistoryView {
  /** Season meta. */
  season: SeasonView;
  /** Games in this season. */
  games: GameSummary[];
  /** Aggregated stats per player. */
  players: SeasonPlayerTotals[];
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
