# First-slice checklist (live stats)

Use with `docs/first-slice.md`. Do not start volunteer, iCal, announcements, or archive work until these boxes are checked.

## Scaffold

- [ ] npm workspaces at repo root
- [ ] `apps/web-client` (Next.js App Router + Tailwind)
- [ ] `apps/api-server` (NestJS)
- [ ] `packages/database` (Prisma + Postgres)
- [ ] `packages/shared-types`
- [ ] `docker-compose.yml` + Dockerfiles (from `assets/templates/docker/` as a start)
- [ ] `.env.example` names only; local `.env` untracked

## Demo path

- [ ] Seed: active season, team, game, coach, parent, player, admin, roster row
- [ ] JWT login works for coach and parent
- [ ] Coach records Kill/Ace/Block/Dig/Error as an inserted `Stat` row (not a counter update)
- [ ] Parent live board updates over Socket.io without reload
- [ ] Team/Game/Stat queries default to `Season.isActive`
- [ ] PLAYER cannot POST stats; anonymous cannot emit on the socket

## Gates

- [ ] `security-review` on auth, JWT, and Socket.io rooms
- [ ] `verify-change` two-tab smoke recorded
- [ ] Working memory still matches reality
- [ ] `npm run verify` (audit + secret scan) still green
