# MCP catalog

Copy an entry into `.cursor/mcp.json` → `mcpServers`. Use the `add-mcp-server` skill.

Never paste secret values. Reload MCP in Cursor after editing. Cloud Agents also need dashboard / team MCP; laptop `~/.cursor/mcp.json` does not apply there.

Configs below match Cursor's project schema (`type` + `command` for stdio, `url` for HTTP). Vendor packages change — prefer the vendor's current docs if install fails.

## How to choose

| Need | Add |
| --- | --- |
| Library / framework docs | `context7` |
| GitHub PRs, issues, files | `github` |
| Issues / planning | `linear` |
| Web deploy (Vercel) | `vercel` |
| Web deploy (Render) | `render` |
| Postgres | `neon` or `supabase` |
| Auth + backend | `supabase` or `firebase` |
| Payments | `stripe` |
| Design | `figma` |
| Browser verification | `playwright` |
| Chat / comms | `slack` |
| Docs wiki | `notion` |
| Observability | `datadog` |

## context7

Use when the agent must look up current library docs.

```json
"context7": {
  "url": "https://mcp.context7.com/mcp",
  "headers": {
    "CONTEXT7_API_KEY": "${env:CONTEXT7_API_KEY}"
  }
}
```

Env: `CONTEXT7_API_KEY` (optional on the public endpoint; add if you have a key).

## github

```json
"github": {
  "type": "stdio",
  "command": "npx",
  "args": ["-y", "@modelcontextprotocol/server-github"],
  "env": {
    "GITHUB_PERSONAL_ACCESS_TOKEN": "${env:GITHUB_PERSONAL_ACCESS_TOKEN}"
  }
}
```

HTTP alternative (GitHub Copilot MCP):

```json
"github": {
  "url": "https://api.githubcopilot.com/mcp/",
  "headers": {
    "Authorization": "Bearer ${env:GITHUB_PERSONAL_ACCESS_TOKEN}"
  }
}
```

Env: `GITHUB_PERSONAL_ACCESS_TOKEN`

## linear

```json
"linear": {
  "url": "https://mcp.linear.app/mcp",
  "headers": {
    "Authorization": "Bearer ${env:LINEAR_API_KEY}"
  }
}
```

Env: `LINEAR_API_KEY`

## vercel

```json
"vercel": {
  "url": "https://mcp.vercel.com"
}
```

OAuth is handled in Cursor. For tokens in CI / stdio tools, use `VERCEL_TOKEN` in Cloud Secrets.

## render

```json
"render": {
  "url": "https://mcp.render.com/mcp",
  "headers": {
    "Authorization": "Bearer ${env:RENDER_API_KEY}"
  }
}
```

Env: `RENDER_API_KEY`

## supabase

```json
"supabase": {
  "type": "stdio",
  "command": "npx",
  "args": ["-y", "@supabase/mcp-server"],
  "env": {
    "SUPABASE_ACCESS_TOKEN": "${env:SUPABASE_ACCESS_TOKEN}"
  }
}
```

Env: `SUPABASE_ACCESS_TOKEN` (and project refs as needed). Confirm the current package name in Supabase docs.

## neon

```json
"neon": {
  "type": "stdio",
  "command": "npx",
  "args": ["-y", "@neondatabase/mcp-server"],
  "env": {
    "NEON_API_KEY": "${env:NEON_API_KEY}"
  }
}
```

Env: `NEON_API_KEY`

## stripe

```json
"stripe": {
  "url": "https://mcp.stripe.com"
}
```

Or stdio:

```json
"stripe": {
  "type": "stdio",
  "command": "npx",
  "args": ["-y", "@stripe/mcp", "--tools=all"],
  "env": {
    "STRIPE_SECRET_KEY": "${env:STRIPE_SECRET_KEY}"
  }
}
```

Env: `STRIPE_SECRET_KEY` (test key for local).

## figma

```json
"figma": {
  "url": "https://mcp.figma.com/mcp",
  "headers": {
    "Authorization": "Bearer ${env:FIGMA_ACCESS_TOKEN}"
  }
}
```

Env: `FIGMA_ACCESS_TOKEN`

## playwright

Use for browser verification of a web UI.

```json
"playwright": {
  "type": "stdio",
  "command": "npx",
  "args": ["-y", "@playwright/mcp"]
}
```

## slack

```json
"slack": {
  "url": "https://mcp.slack.com/mcp",
  "headers": {
    "Authorization": "Bearer ${env:SLACK_BOT_TOKEN}"
  }
}
```

Env: `SLACK_BOT_TOKEN` (and usually a team/workspace install). Prefer OAuth in Cursor when available.

## notion

```json
"notion": {
  "url": "https://mcp.notion.com/mcp",
  "headers": {
    "Authorization": "Bearer ${env:NOTION_API_KEY}"
  }
}
```

Env: `NOTION_API_KEY`

## firebase

```json
"firebase": {
  "type": "stdio",
  "command": "npx",
  "args": ["-y", "firebase-tools", "experimental:mcp"]
}
```

Auth is typically `firebase login` on the machine, or a service account via env. Do not commit service account JSON.

## datadog

```json
"datadog": {
  "url": "https://mcp.datadoghq.com/mcp",
  "headers": {
    "DD-API-KEY": "${env:DD_API_KEY}",
    "DD-APPLICATION-KEY": "${env:DD_APP_KEY}"
  }
}
```

Env: `DD_API_KEY`, `DD_APP_KEY`

## Custom HTTP server

```json
"my-service": {
  "url": "https://example.com/mcp",
  "headers": {
    "Authorization": "Bearer ${env:MY_SERVICE_TOKEN}"
  }
}
```

## Custom stdio server

```json
"my-local": {
  "type": "stdio",
  "command": "node",
  "args": ["${workspaceFolder}/tools/mcp-server.js"],
  "env": {
    "MY_SERVICE_TOKEN": "${env:MY_SERVICE_TOKEN}"
  },
  "envFile": "${workspaceFolder}/.env"
}
```
