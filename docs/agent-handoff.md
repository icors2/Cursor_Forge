# Agent handoff — restart here

Read this on a new session. Chat does not persist. Working memory is `.cursor/rules/memory.mdc`.

**Updated:** 2026-09-25

## Where the work lives

| Item | Value |
| --- | --- |
| Product | Volleyball Manager — club seasons, rosters, live stats, volunteer, calendar, news, notes, dues, theme, admin, registration |
| Status | `active` (do **not** re-run `bootstrap-project`) |
| Working branch | `cursor/wave2-club-registration-7bd1` |
| Open PR | https://github.com/icors2/Cursor_Forge/pull/2 (draft → `main`) |
| Older product branch | `cursor/start-new-app-b09f` (LAN + first modules; **missing** Wave 1/2 + Playwright MCP) |
| `main` | Still the blank Cursor starter. Do not commit product work there. |
| Repo | https://github.com/icors2/Cursor_Forge |

## What already shipped

**Wave 1 (club UX)** — role-aware nav buttons, Stat Tracking (`/coach`), ICS import, news comments + mute, volunteer click-to-sign, roster without dues, printable season history, self-serve theme.

**Wave 2 (registration)** — `/admin`; `POST /auth/register` (PARENT/PLAYER, or COACH with a one-time hashed invite from `POST /auth/coach-keys`); coach create-and-open on `/registrations`; player pool; `/roster` positions (`OH/MB/S/L/OPP/DS`).

**Playwright MCP** — repo config is headless Chromium (`.cursor/mcp.json` + `.cursor/playwright-mcp.json`). Stdio `initialize` was proven. **This Cloud run still will not see Playwright tools until MCP is reloaded and the same stdio server is added in dashboard / team MCP.** Laptop `~/.cursor/mcp.json` does not apply here.

Source list: `docs/volleyball-manager-updates.md` (Wave 1/2 items are implemented).

## What is not in v1

Stripe, Redis, Storybook, public ADMIN signup, multi-club, production host.

## Open questions (do not invent)

- Production host (Render, Fly, VPS, …)?
- Youth/minor PII consent (COPPA) before public launch?
- Club branding / display name?

## First commands after restart

```bash
npm install
npm run dev:pg          # embedded Postgres on 5433 if Docker is down
npm run db:setup        # migrate + seed
npm run dev:lan         # web 3010 + API 4010 on the LAN IP — see TESTING.md
# or: npm run dev:api && npm run dev:web
npm run smoke           # full module smoke
npm run verify          # Cursor setup audit + secret scan
```

Demo password `Demo1234!`: `admin@demo.local`, `coach@demo.local`, `parent@demo.local`, `parent2@demo.local`, `parent-unpaid@demo.local`, `player@demo.local`, `player2@demo.local`, `player-unpaid@demo.local`.

## Suggested next work (ask if unclear)

1. Reload Playwright MCP (dashboard + project) and browser-walk coach create-and-open → parent apply → promote → `/roster`.
2. Mark PR #2 ready and/or merge Wave 2 to `main` when the user wants that.
3. Named Wave 3 or a production host — only if the user picks one.

## Pointers

- Run/test: `AGENTS.md` **Project-specific**
- Snapshot: `.cursor/rules/memory.mdc`
- Decisions / conventions / lessons: `.cursor/rules/{decisions,conventions,lessons}.mdc`
- Plan: `docs/repo-plan.md` · first slice (historical): `docs/first-slice.md`
- LAN: `TESTING.md`
- Domain skill: `add-domain-module`
