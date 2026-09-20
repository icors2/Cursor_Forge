# First-slice checklist (live stats)

Use with `docs/first-slice.md`. Do not start volunteer, iCal, announcements, or archive work until these boxes are checked.

## Scaffold

- [x] npm workspaces at repo root
- [x] `apps/web-client` (Next.js App Router + Tailwind)
- [x] `apps/api-server` (NestJS)
- [x] `packages/database` (Prisma + Postgres)
- [x] `packages/shared-types`
- [x] `docker-compose.yml` + Dockerfiles (from `assets/templates/docker/` as a start)
- [x] `.env.example` names only; local `.env` untracked

## Demo path

- [x] Seed: active season, team, game, coach, parent, player, admin, roster row
- [x] JWT login works for coach and parent
- [x] Coach records Kill/Ace/Block/Dig/Error as an inserted `Stat` row (not a counter update)
- [x] Parent live board updates over Socket.io without reload (`npm run smoke` + `stat.created`)
- [x] Team/Game/Stat queries default to `Season.isActive`
- [x] PLAYER cannot POST stats; anonymous cannot emit on the socket

## Gates

- [x] `security-review` on auth, JWT, and Socket.io rooms (see `decisions.mdc` 2026-09-20)
- [x] `verify-change` smoke recorded (`npm run smoke` PASS; no browser tools in this environment)
- [x] Working memory still matches reality
- [x] `npm run verify` (audit + secret scan) still green
