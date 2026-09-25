# First slice — live stat demo

Historical scope. The live-stat slice **and** later Wave 1/2 club modules are implemented. New session: `docs/agent-handoff.md`.

Scoped with `scope-feature` from `Setup.md`. One demo moment, not the full platform.

## Goal

A coach can record a volleyball stat during a live game and a parent (or spectator) sees it appear immediately.

## Demo moment

1. Sign in as the seeded **coach**.
2. Open the active-season game.
3. Tap **Kill** (or Ace / Block / Dig / Error) on a rostered player.
4. A second browser (seeded **parent**) shows the new timestamped stat on the live board **without a full page reload**.

## In scope

- Docker Compose: Postgres + `api-server` + `web-client`
- Prisma models needed for the path: `User`, `Role`, `Season`, `Team`, `Roster`, `Game`, `Stat`, `StatType`
- Seed: one active season, one team, one game, coach / parent / player / admin, one roster row
- NestJS JWT login + RBAC guards (COACH writes stats; PARENT/PLAYER read)
- NestJS Socket.io gateway: persist a `Stat` **event row**, broadcast to the game room
- Next.js: login, coach stat pad, live board
- Active-season scoping on Team / Game / Stat queries
- Comments on every new file, function, and interface (`system-prompt.md`)

## Out of scope (at least these)

- Volunteer slots, capacity locks, overbooking
- iCal / Google Calendar subscribe
- Announcements
- Coach notes CRUD
- Season archive / historical UI (`archiveSeason`)
- Payment processor / self-serve dues (ADMIN may still have `isDuesPaid` on the User model; no parent pay flow)
- Tournament brackets, inventory
- Storybook / full `packages/ui-components`
- Redis season cache
- Self-serve public registration
- Email, file uploads, multi-club tenancy

## Stack / recipes

- Playbooks: `assets/stack-playbooks/web-nextjs.md` + NestJS (not `api-node` Fastify)
- Recipes: `auth.md` (JWT on Nest), `database.md` + `migrate-database`, `realtime.md`, `seed-data.md`
- Verify: `verify-change` — two-browser (or two-tab) smoke of the demo moment
- Security: `security-review` before the slice is called done (auth + PII)

## Success bar

- Coach tap → `Stat` row exists → parent board updates
- Logged-out client cannot emit stats
- PLAYER cannot write stats
- Queries for the game/team do not leak a previous season’s rows

Implemented on `cursor/start-new-app-b09f`. Prove with `npm run smoke`. UI is `apps/web-client` (`/` login, `/coach/game/[id]`, `/live/[id]`).
