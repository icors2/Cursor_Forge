---
name: add-domain-module
description: Add an isolated Volleyball Manager feature module (NestJS + Prisma + Next.js page) without leaking into other domains. Use when adding Roster, Stats, Volunteering, Announcements, Coach Notes, or Season Archive.
---

# Add a domain module

## When to use

- Implementing a feature listed in `Setup.md` / `system-prompt.md` as its own plugin
- Extending past the first slice (`docs/first-slice.md`) without collapsing modules together

## Preconditions

- Read `.cursor/rules/memory.mdc`, `docs/repo-plan.md`, and `system-prompt.md`
- Confirm the slice is in scope (first slice is live stats only)
- Prisma models for this domain exist or are being added in the same change

## Steps

1. **Name the module** (one domain): e.g. `stats`, `roster`, `volunteering`, `announcements`, `notes`, `seasons`.
2. **API:** add a NestJS module under `apps/api-server` with its own controller, service, DTOs, and guards. Do not reach into another module’s repositories.
3. **Data:** put schema changes in `packages/database`. Use `migrate-database`. Parameterized Prisma only.
4. **Season scope:** any Team / Game / Stat query defaults to the active season unless the request is explicitly historical (`?historical=true&seasonId=`).
5. **RBAC:** JWT guard + role guard. Map roles from `system-prompt.md` (ADMIN / COACH / PLAYER / PARENT). Never accept `isDuesPaid` or `role` from a generic user update body.
6. **Realtime:** if the module broadcasts, authorize the Socket.io room; persist first, then emit. Stats are event-sourced inserts.
7. **Web:** add the thinnest Next.js App Router page(s) in `apps/web-client`. Share types via `packages/shared-types`.
8. **Comments:** every new file, function, and interface gets an explanatory comment (`system-prompt.md` data constraint).
9. **Concurrency:** volunteer capacity uses a transaction + lock and HTTP 409; do not check-then-insert without a lock.

## Verify

- Role that should succeed can; others 401/403
- Active-season queries do not return archived season rows
- `verify-change` smokes the new happy path
- Auth or PII surfaces also run `security-review`

## Failure modes

- Putting volunteer or iCal code into the stats module “while we’re here”
- Updating a numeric counter instead of inserting a `Stat` row
- Forgetting season scope on a new list endpoint
- Exposing `isDuesPaid` on a self-serve PATCH
