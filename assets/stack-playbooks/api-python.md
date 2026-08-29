# Playbook: Python HTTP API

Use when they asked for an API only and implied Python, or when there is no UI in sight.

## Scaffold

Prefer `uv`:

```bash
uv init
uv add fastapi uvicorn
```

Or FastAPI in a `src/` package with a `README` that shows `uv run uvicorn`.

## After scaffold

- Bind to `0.0.0.0:$PORT` in production.
- Do not add a database unless they need one.
- MCP: `context7`; add `neon` / `supabase` only if you introduce Postgres.
- Write run/test steps into `AGENTS.md`.
