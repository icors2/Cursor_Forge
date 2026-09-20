# Volleyball Manager — repo plan

Canonical product spec: `Setup.md`. Agent master prompt: `system-prompt.md`.
First shippable slice: `docs/first-slice.md`.

This is a **plan**. Do not scaffold `apps/` or `packages/` until the next implementation turn.

## Product

| Field | Value |
| --- | --- |
| **Name** | Volleyball Manager (`volleyball-manager`) |
| **Audience** | Club volleyball programs — ADMIN, COACH, PLAYER, PARENT |
| **Purpose** | Manage seasons, teams, rosters, live game stats, volunteering, and announcements with seasonal archives |

## Stack (from Setup.md — not golden path)

| Layer | Choice |
| --- | --- |
| Web / BFF | Next.js App Router + Tailwind (`apps/web-client`) |
| API | NestJS (`apps/api-server`) |
| Database | PostgreSQL + Prisma (`packages/database`) |
| Shared TS | `packages/shared-types` |
| Shared UI | `packages/ui-components` (later; not required for first slice) |
| Realtime | Socket.io on the API, subscribed from the web client |
| Tooling | npm workspaces |
| Runtime | Docker + Docker Compose |

**Not chosen:** Vercel-only Next app, shadcn as a second kit, Neon/Supabase hosted DB, Stripe (dues are an ADMIN flag until a processor is named).

## Deploy

- **Now:** local Docker Compose (`web-client`, `api-server`, `postgres`).
- **Later:** any Linux host that can run the compose stack. Bind HTTP to `0.0.0.0:$PORT`.
- **Filesystem:** ephemeral in cloud PaaS — Postgres is the source of truth; no local uploads in v1.

## Folder layout (repo root = this repo, not a nested `/volleyball-manager`)

```text
Cursor_Forge/
├── apps/
│   ├── web-client/          # Next.js App Router + Tailwind
│   └── api-server/          # NestJS modules, JWT guards, Socket.io gateway
├── packages/
│   ├── database/            # Prisma schema, migrations, seed
│   ├── shared-types/        # Role, StatType, DTOs
│   └── ui-components/       # Shared React (defer Storybook)
├── docker/                  # Dockerfiles
├── docker-compose.yml
├── Setup.md                 # Architectural blueprint + Prisma models
├── system-prompt.md         # Master coding-agent prompt
└── docs/                    # This plan and first-slice scope
```

Starter files (`.cursor/`, `assets/`, `AGENTS.md`) stay at the root.

## External systems

| System | Role | First slice? |
| --- | --- | --- |
| PostgreSQL | System of record | Yes |
| Socket.io | Live stat broadcast | Yes |
| Google Calendar / iCal | Parent subscribe | No |
| Redis | Cached `activeSeasonId` | No (query `Season.isActive`) |
| Payment processor | Dues | No (`isDuesPaid` ADMIN-only) |

## MCP (enabled)

Only servers later agents will call while building this product:

- **context7** — current Next.js / NestJS / Prisma / Socket.io docs (`CONTEXT7_API_KEY` optional)
- **playwright** — browser verification of coach pad + parent board

Not enabled: Vercel, Neon, Supabase, Stripe, Linear, Figma, Slack, GitHub MCP.

Set secret values in local `.env` and Cursor Cloud Secrets. Reload MCP after. Cloud Agents also need dashboard/team MCP — laptop `~/.cursor/mcp.json` does not apply.

## Skills and recipes

Keep starter skills. Domain skill: `add-domain-module`.

When implementing, use:

- `add-integration` + `assets/recipes/auth.md` (JWT on NestJS; not Clerk/Auth.js)
- `assets/recipes/database.md` + `migrate-database`
- `assets/recipes/realtime.md` (Socket.io; authorize subscribe)
- `assets/recipes/seed-data.md` for the demo roster/game
- `security-review` before any auth or public API ships
- `polish-ui` before a public URL

## Env var names (no values)

Required once the app exists:

- `DATABASE_URL`
- `JWT_SECRET`
- `NEXT_PUBLIC_API_URL`
- `POSTGRES_USER`
- `POSTGRES_PASSWORD`
- `POSTGRES_DB`

Optional / later:

- `JWT_EXPIRES_IN`
- `PORT` / `API_PORT` (API bind; production `0.0.0.0:$PORT`)
- `CONTEXT7_API_KEY` (MCP)
- `REDIS_URL` (season cache, not first slice)

## Threat model (auth + PII + payment-status + public API)

See `decisions.mdc` (2026-09-20). Short form:

- **Data:** account (email, password hash, name), role, `isDuesPaid`, coach notes, volunteer signups, game stats. Likely **youth/minor PII**.
- **Boundaries:** browser → Next → NestJS → Postgres; Socket.io; later iCal feed.
- **Attackers:** privilege escalation (`isDuesPaid`, role), stolen JWT, concurrent volunteer overbook, anonymous iCal scrape.
- **Open risks:** no key-rotation runbook yet; no payment processor; COPPA/consent before public launch; iCal is a public-ish feed.

## Implementation order (after this plan)

1. Scaffold npm workspaces + Docker Compose + Prisma schema from `Setup.md`.
2. Ship **first slice** (`docs/first-slice.md`) — live stat demo moment.
3. Later modules (each via `add-domain-module`): volunteer + lock, iCal UTC, announcements, coach notes, season archive, dues admin UI.

## Guardrails (never skip)

From `Setup.md` §3:

1. Stats are **event inserts** (`Stat` rows), not `count = count + 1`.
2. Teams / Games / Stats queries **default to the active season**; historical needs `?historical=true&seasonId=`.
3. Volunteer register uses a **transaction + lock**; HTTP 409 on full.
4. `scheduledAt` stored **UTC**; iCal emits `YYYYMMDDThhmmssZ`.
5. `isDuesPaid` is **ADMIN-only** — never on the generic user update route.
