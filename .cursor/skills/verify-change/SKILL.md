---
name: verify-change
description: Prove a change works before claiming done. Use after implementing a feature or fix, before ship-change, or when the user asks how to verify.
---

# Verify a change

"It compiles" is not verification. State what you actually ran.

## When to use

- After implementing or fixing something
- Before `ship-change` or opening a PR
- When `AGENTS.md` Project-specific lists verify steps

## Preconditions

- Know what changed (files / behavior)
- Prefer project scripts from `AGENTS.md` / `package.json` over ad-hoc commands

## Pick the cheapest sufficient evidence

Run in order; stop when evidence covers the change:

1. **Static** — typecheck / lint for the touched language
2. **Unit / integration** — tests that cover the changed behavior; add a test if none exist and the logic is non-trivial
3. **Build** — production build if the change affects bundling or deploy
4. **Runtime** — curl / CLI for APIs; browser only for user-visible UI
5. **Starter gates** — `npm run verify` when you touched Cursor rules, skills, MCP, or scripts

Skip browser automation for pure backend or docs changes. Skip build when only markdown/rules changed (still run `npm run verify` for starter files).

## Steps

1. Read **Project-specific** in `AGENTS.md` for install/run/test/verify.
2. Choose checks from the list above.
3. Run them. Capture exit codes and relevant output.
4. If a check fails, fix or report — do not claim done.
5. In your reply, list: commands run, pass/fail, and any manual step left for the user.

## Verify

- You named the commands
- Failures are not ignored
- UI claims include a real browser or explicit "not verified in browser"

## Failure modes

- Claiming done after only `tsc` → add a behavioral check
- Running the whole suite when one unit test would do → prefer focused tests first, then broader CI
- Skipping `npm run verify` after editing `.cursor/` or `scripts/` → run it
