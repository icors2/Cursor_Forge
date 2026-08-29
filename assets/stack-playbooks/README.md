# Stack playbooks

Pick one during `bootstrap-project` only if the user wants a product scaffolded now.

| File | When |
| --- | --- |
| `web-nextjs.md` | Browser UI / dashboard; default if they did not name a stack |
| `web-vite.md` | They asked for Vite, or a static/toy/game UI |
| `api-python.md` | HTTP API, Python implied or no UI |
| `cli.md` | Command-line tool or script |

Do not invent a monorepo. Do not add auth or a database unless the request needs it.
