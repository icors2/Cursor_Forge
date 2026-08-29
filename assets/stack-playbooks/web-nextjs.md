# Playbook: Next.js web app

Use when the user wants a browser UI, dashboard, or app and did not name another stack.

## Scaffold

Do **not** target `/workspace` or `.` with `create-next-app` if the parent directory is not writable. Scaffold into a subdirectory, then move files up.

```bash
npx create-next-app@latest tmp-scaffold --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm
```

Add shadcn/ui if the UI is React and they did not name another component library.

## After scaffold

- Bind any custom server to `0.0.0.0:$PORT` only if you add one; Next.js handles this.
- Dev server: uncommon port (avoid 3000 / 5173 / 8080 when you can).
- MCP: `context7` almost always; `vercel` if they deploy there; `playwright` if you will verify in a browser.
- Skills: add a verify/deploy skill only if those workflows will repeat.
- Write run/test steps into `AGENTS.md`.
