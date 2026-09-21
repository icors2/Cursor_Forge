# Testing Volleyball Manager from a Windows PC

Headless Linux worker. The **browser runs on the PC**, not on this VM. No desktop/GUI on the worker.

Stable ports: **3010** (Next.js web) and **4010** (NestJS API). Both bind `0.0.0.0`.

## Confirmed LAN IP

`ens18` is `192.168.0.212`. Re-check with `ip -br a` if the NIC changes. For Tailscale, use that IP the same way: `LAN_IP=<tailscale-ip> npm run dev:lan`.

## Start (on the worker)

From the repo root, with `.env` already filled (`DATABASE_URL`, `JWT_SECRET`, … — never commit `.env`):

```bash
npm install             # required once (and after pulling lockfile changes)
npm run dev:pg          # skip if Postgres is already up on 5433
npm run db:setup        # first time, or after pulling migrations
npm run dev:lan         # or: tmux new-session -d -s vm-lan 'npm run dev:lan'
```

If Nest prints `PackageLoader` / `No driver (HTTP)`, `node_modules` is incomplete or mixed Nest 12 adapters with Nest 10. Stay on the repo root and run `npm install` — do not `npm install @nestjs/platform-express@latest`.

`dev:lan` auto-detects the LAN IPv4, starts the API and web on `0.0.0.0`, sets:

- `NEXT_PUBLIC_API_URL=http://<LAN_IP>:4010` (not localhost)
- `WEB_ORIGIN` to include `http://<LAN_IP>:3010` plus localhost

Override detection: `LAN_IP=192.168.0.212 npm run dev:lan`

## PC browser

- **App:** http://192.168.0.212:3010
- **API** (what the browser calls): http://192.168.0.212:4010
- Health check: http://192.168.0.212:4010/health

Demo logins (password `Demo1234!`): `admin@demo.local`, `coach@demo.local`, `parent@demo.local`, `player@demo.local`.

## Stop

In the `dev:lan` terminal: **Ctrl+C**.  
If it was started in tmux: `tmux kill-session -t vm-lan`  
Do not leave orphan `node` processes; confirm with `ss -tlnp | grep -E ':(3010|4010)'`.

## Firewall

Do not disable the firewall. This worker currently has **no `ufw` binary** and no passwordless sudo. If `ufw` is active later and the PC cannot connect, run:

```bash
sudo ufw allow 3010/tcp comment 'volleyball-web'
sudo ufw allow 4010/tcp comment 'volleyball-api'
sudo ufw status
```

## SSH tunnel fallback (if LAN bind is blocked)

On Windows (OpenSSH or PuTTY local forwards):

```text
ssh -L 3010:127.0.0.1:3010 -L 4010:127.0.0.1:4010 cursoragent@192.168.0.212
```

On the worker, start with localhost URLs so the tunneled browser talks to 127.0.0.1:

```bash
LAN_IP=127.0.0.1 npm run dev:lan
```

Then on the PC: http://127.0.0.1:3010 (API via the second forward at http://127.0.0.1:4010).
