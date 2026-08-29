# Bootstrap checklist

Use with the `bootstrap-project` skill.

## Product

- [ ] Purpose and name written in `.cursor/rules/memory.mdc`
- [ ] Stack chosen (or explicitly "template only")
- [ ] Deploy target recorded (or local-only)

## Cursor setup

- [ ] Status set to `bootstrapping`, then `active`
- [ ] MCP servers merged into `.cursor/mcp.json` from `mcp-catalog.md`
- [ ] Env **names** in `.env.example` and `memory.mdc`
- [ ] User told where to put secret values
- [ ] Domain skills added for repeatable workflows
- [ ] `AGENTS.md` Project-specific section rewritten
- [ ] Decision logged if a stack or vendor was chosen
- [ ] `node scripts/audit-cursor-setup.mjs` is clean

## Do not

- [ ] No secrets in git
- [ ] No unused MCP servers
- [ ] No always-apply dump of this checklist
