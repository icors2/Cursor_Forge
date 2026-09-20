# Volleyball Team Management Platform - AI Architect Blueprint

## 1. Architectural Blueprint

The system is designed as a modular, containerized monorepo utilizing Domain-Driven Design (DDD) to encapsulate features as pluggable modules. This ensures the addition of future features (e.g., tournament brackets, inventory management) without polluting the core domain.

### Recommended Technology Stack

* **Frontend/BFF:** Next.js (React) with Tailwind CSS (Server Components for performance, Client Components for live stats).
* **Backend:** Node.js with NestJS (chosen specifically for its out-of-the-box support for modular, heavily decoupled plugin architectures).
* **Database:** PostgreSQL (Relational integrity is mandatory for seasonal historical data).
* **ORM:** Prisma (Type-safe schema definition and migration).
* **Real-time:** Socket.io (For live game stat recording and broadcast).
* **Infrastructure:** Docker & Docker Compose.

### Monorepo File Hierarchy

```text
# ==========================================
# ROOT DIRECTORY STRUCTURE
# ==========================================
/volleyball-manager
├── /apps
│   ├── /web-client          # Next.js frontend application
│   └── /api-server          # NestJS backend API
├── /packages
│   ├── /database            # Prisma schema, migrations, and seed scripts
│   ├── /shared-types        # TypeScript interfaces shared across web/api
│   └── /ui-components       # Reusable React components (Storybook)
├── /docker                  # Dockerfiles and compose configurations
└── docker-compose.yml       # Orchestration for local deployment

```

### Core Data Model (Prisma Schema)

```prisma
// ==========================================
// DATABASE SCHEMA DEFINITION (PostgreSQL)
// ==========================================

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ------------------------------------------
// CORE DOMAIN: Users & Authentication
// ------------------------------------------
model User {
  id             String    @id @default(uuid())
  email          String    @unique
  passwordHash   String
  role           Role      @default(PLAYER) // Enum: ADMIN, COACH, PLAYER, PARENT
  firstName      String
  lastName       String
  isDuesPaid     Boolean   @default(false)
  
  // Relations
  rosterEntries  Roster[]
  notesTargeted  CoachNote[] @relation("PlayerNotes")
  notesAuthored  CoachNote[] @relation("AuthoredNotes")
  volunteering   VolunteerRegistration[]
}

enum Role {
  ADMIN
  COACH
  PLAYER
  PARENT
}

// ------------------------------------------
// CORE DOMAIN: Organization & Archiving
// ------------------------------------------
model Season {
  id        String   @id @default(uuid())
  year      Int
  name      String   // e.g., "Fall 2026"
  isActive  Boolean  @default(true) // Only ONE season can be active at a time
  
  // Relations
  teams     Team[]
  games     Game[]
}

model Team {
  id        String   @id @default(uuid())
  name      String
  seasonId  String
  
  // Relations
  season    Season   @relation(fields: [seasonId], references: [id])
  roster    Roster[]
  games     Game[]   @relation("TeamGames")
}

// ------------------------------------------
// PLUGIN MODULE: Roster & Stats
// ------------------------------------------
model Roster {
  id        String   @id @default(uuid())
  userId    String
  teamId    String
  jerseyNum Int?
  
  // Relations
  user      User     @relation(fields: [userId], references: [id])
  team      Team     @relation(fields: [teamId], references: [id])
  stats     Stat[]
}

model Game {
  id          String   @id @default(uuid())
  teamId      String
  opponent    String
  scheduledAt DateTime
  seasonId    String
  
  // Relations
  team        Team     @relation("TeamGames", fields: [teamId], references: [id])
  season      Season   @relation(fields: [seasonId], references: [id])
  stats       Stat[]
}

model Stat {
  id        String   @id @default(uuid())
  gameId    String
  rosterId  String
  type      StatType // Enum: KILL, ACE, BLOCK, DIG, ERROR
  timestamp DateTime @default(now())
  
  // Relations
  game      Game     @relation(fields: [gameId], references: [id])
  roster    Roster   @relation(fields: [rosterId], references: [id])
}

enum StatType {
  KILL
  ACE
  BLOCK
  DIG
  ERROR
}

// ------------------------------------------
// PLUGIN MODULE: Coach Notes
// ------------------------------------------
model CoachNote {
  id        String   @id @default(uuid())
  playerId  String
  coachId   String
  content   String
  createdAt DateTime @default(now())
  
  // Relations
  player    User     @relation("PlayerNotes", fields: [playerId], references: [id])
  coach     User     @relation("AuthoredNotes", fields: [coachId], references: [id])
}

// ------------------------------------------
// PLUGIN MODULE: Volunteering
// ------------------------------------------
model VolunteerSlot {
  id          String   @id @default(uuid())
  title       String   // e.g., "Concessions", "Line Judge"
  startTime   DateTime
  endTime     DateTime
  capacity    Int
  
  // Relations
  registrations VolunteerRegistration[]
}

model VolunteerRegistration {
  id        String   @id @default(uuid())
  userId    String
  slotId    String
  
  // Relations
  user      User           @relation(fields: [userId], references: [id])
  slot      VolunteerSlot  @relation(fields: [slotId], references: [id])
}

// ------------------------------------------
// PLUGIN MODULE: Announcements
// ------------------------------------------
model Announcement {
  id        String   @id @default(uuid())
  title     String
  content   String
  authorId  String
  createdAt DateTime @default(now())
  expiresAt DateTime?
}

```

---

## 2. Complete Agent System Prompt

Save the following code block as `system-prompt.md` in your repository. This is the master prompt you will feed to your coding AI.

```markdown
# Role
You are an Expert Full-Stack Developer specializing in React, Node.js, and PostgreSQL. You are tasked with building a modular, containerized Volleyball Team Management Platform.

# Architecture & Constraints
1. **Frameworks:** Use Next.js (App Router) for the frontend and NestJS for the backend. Use Prisma for database modeling with PostgreSQL.
2. **Modularity:** Treat every feature (Roster, Stats, Volunteering, Announcements) as a strictly isolated module. The `api-server` must utilize NestJS modules to encapsulate routes, services, and DTOs.
3. **Data Constraint (MANDATORY):** Always include detailed comments and labels in all code blocks. Every file, function, and interface must have explanatory comments to make specific sections easy to find and modify. 
4. **RBAC Security:** Implement strict Role-Based Access Control via JWT and guards.
   - ADMIN: Full access, Season Archiving, Dues verification, Volunteer setup.
   - COACH: Game setup, Stat recording, Player notes (read/write), Announcements.
   - PLAYER: View stats, View calendar.
   - PARENT: View calendar, Register for volunteer slots, Pay/Verify dues.
5. **Seasonal Archiving Design:** The system spans multiple seasons. All database queries for Teams, Games, and Stats MUST automatically scope to the `active` Season ID unless an historical archive view is specifically requested.
6. **Containerization:** The final output must include production-ready Dockerfiles and a `docker-compose.yml`.

# Core Modules to Implement

## 1. Authentication & Users
- Build JWT-based auth.
- Create user registration and login endpoints.
- Implement middleware to verify `isDuesPaid` flag for specific portal access.

## 2. Season & Team Management
- Create an Admin endpoint to `archiveSeason`. This must set the current season to `isActive: false` and initialize a new empty season, preserving all relational data via `seasonId` foreign keys.
- Allow creation of Teams tied to the active season.

## 3. Roster & Live Stats (Real-Time)
- Create a player roster linked to a team.
- Build a Coach Notes CRUD interface linked to specific players on the roster.
- **Live Stats:** Create a WebSocket gateway (Socket.io) to record stats (Kills, Aces, Blocks, Digs) during live games with high concurrency, broadcasting updates to connected clients (parents/spectators).

## 4. Scheduling & Volunteer Tracking
- **iCal Integration:** Create a route that generates and serves a dynamic `.ics` file formatting all scheduled games for a specific team, allowing parents to subscribe via Google Calendar.
- **Volunteering:** Admins create `VolunteerSlot`s. Parents register. Enforce capacity limits using database transactions to prevent double-booking.

## 5. Announcement Board
- Build a simple CRUD module for coaches to post announcements.

# Output Formatting
When generating code, output only the specific requested files. Use markdown code blocks with the exact file path as the title. Ensure heavy, descriptive comments are present throughout the generated code.

```

---

## 3. Edge Cases & Guardrails

When executing this blueprint, ensure the development agent actively addresses the following architectural risks:

### A. The "Stat Recording" Race Condition

During live games, coaches will rapidly tap buttons to record stats (e.g., three rapid touches in a rally).

* **Guardrail:** The API must not rely on simple `UPDATE stats SET count = count + 1`. It must insert individual timestamped `Stat` event rows (Event Sourcing pattern). Aggregation should happen on read (or via materialized views). This prevents data loss during concurrent network requests.

### B. Season Archiving Data Leakage

When a season rolls over, it is highly likely that UI components will accidentally query the entire `Team` table, displaying last year's teams on the current dashboard.

* **Guardrail:** Enforce a global parameter/interceptor at the API level. Every route must extract the `activeSeasonId` (cached in Redis or a global context) and append it to the Prisma `where` clause. Historical data fetching must require an explicit `?historical=true&seasonId=xyz` query parameter.

### C. Volunteer Slot Overbooking (Concurrency)

Two parents might attempt to click "Register" for the final Concession Stand slot at the exact same millisecond.

* **Guardrail:** The volunteer registration endpoint must use a Database Transaction with an explicit lock, or rely on Prisma's atomic operations. First, check `COUNT(registrations) < capacity`, then insert. If the constraint fails, return an HTTP 409 Conflict.

### D. iCal Timezone Drift

Google Calendar caching and timezone rendering are notoriously brittle with dynamic `.ics` feeds.

* **Guardrail:** Store all `scheduledAt` times in absolute UTC in the PostgreSQL database. When generating the iCal feed, explicitly set the `TZID` property and ensure all output strings are formatted strictly to `YYYYMMDDThhmmssZ` standard.

### E. Dues Verification State

Payment of dues often dictates whether a player can be added to a live game roster.

* **Guardrail:** The `isDuesPaid` boolean must be decoupled from the standard User update route to prevent privilege escalation where a user modifies their own JSON payload to set `isDuesPaid: true`. Only `ADMIN` roles may hit the patch endpoint for this specific field.