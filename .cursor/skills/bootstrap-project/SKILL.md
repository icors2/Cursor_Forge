---
name: bootstrap-project
description: First-run setup for a repo cloned from this Cursor starter. Use when Status is unbootstrapped, when starting a new product in this repo, or when the user asks to set up MCP, skills, assets, or the project stack.
---

# Bootstrap project

Do this before writing product code when `.cursor/rules/memory.mdc` says `unbootstrapped`.

## Goal

Leave the repo ready for later agents: stack chosen (if needed), MCP enabled, skills and assets in place, working memory updated, `AGENTS.md` project-specific section rewritten.

## Steps

### 1. Orient

Read:

- `.cursor/rules/memory.mdc`
- `AGENTS.md`
- `assets/checklists/bootstrap.md`

Set `Status` to `bootstrapping` in `memory.mdc` if you are going to continue.

### 2. Identify the product

Infer from the user's request. Ask only for gaps:

- What are we building? Who is it for?
- Stack, if they did not name one (use the defaults in `assets/stack-playbooks/` — do not ask if a default is obvious)
- Deploy target (local-only is fine)
- External systems (GitHub, Linear, Vercel, Stripe, Figma, Slack, a database, …)

Write the answers into `memory.mdc` as you go.

### 3. Scaffold only if they want a product now

If this repo is still a template and they asked to build something:

- Follow the matching playbook in `assets/stack-playbooks/`
- Prefer an official scaffold
- Do not add auth, a database, or a second component library unless the request needs them

If they only wanted the Cursor setup, skip scaffolding.

### 4. MCP servers

1. Open `assets/mcp-catalog.md`.
2. Pick servers this project will actually call.
3. Follow the `add-mcp-server` skill for each.
4. Tell the user which environment variables or Cloud Secrets to set. Never write values into the repo.
5. If you cannot edit `.cursor/mcp.json` (sandbox), give them the exact JSON to paste.

### 5. Skills

Create a project skill for each multi-step workflow you expect to repeat (deploy, migrate, release, design-to-code, …). Follow `create-project-skill`.

Do not clone every starter skill. Keep the starter skills; add domain ones.

### 6. Assets

Copy only what you need out of `assets/templates/` and the stack playbook. Typical additions:

- `.env.example` entries (names only)
- PR / issue templates if they use GitHub
- Domain rule files (globbed) for the stack you just chose

Delete unused playbooks only if the user wants a lean repo. Default: leave the catalog; later projects from this template still need it.

### 7. Memory and instructions

1. Follow `update-working-memory`.
2. Set `Status` to `active`.
3. Replace the **Project-specific** section in `AGENTS.md` with how to install, run, test, and verify.
4. Add a decision entry if you chose a stack or deploy target.
5. Run `node scripts/audit-cursor-setup.mjs` and fix what it reports.

### 8. Stop conditions

You are done when:

- `memory.mdc` Status is `active`
- `AGENTS.md` has real run/test instructions (or states that this is still a template-only repo)
- MCP list in memory matches `.cursor/mcp.json`
- The user knows which secrets to add and where

Then continue with the original product request, if any.
