# Playbook: Vite + React

Use for a static page, toy, or game, or when they asked for Vite.

## Scaffold

```bash
npm create vite@latest tmp-scaffold -- --template react-ts
```

Move generated files to the repo root if this starter is still empty of app code. Add Tailwind and shadcn/ui when they did not name another component library.

## After scaffold

- Keep a real `npm run dev` script. Do not ship a lone HTML file.
- MCP: `context7`; `playwright` for UI verification.
- Write run/test steps into `AGENTS.md`.
