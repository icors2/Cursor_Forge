#!/usr/bin/env node
/**
 * LAN / Tailscale dev launcher.
 * Binds web+API on 0.0.0.0, sets NEXT_PUBLIC_API_URL and WEB_ORIGIN from the detected host IP
 * so a Windows browser on the LAN can reach both services. Does not print secret env values.
 */

import { execSync, spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { createConnection } from "node:net";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const WEB_PORT = Number(process.env.WEB_PORT ?? 3010);
const API_PORT = Number(process.env.API_PORT ?? process.env.PORT ?? 4010);
const PG_PORT = Number(process.env.PG_PORT ?? 5433);

/** Child processes to stop on Ctrl+C. */
const children = [];

/** Loads .env into process.env without overriding already-set keys. Never logs values. */
function loadDotEnv() {
  const path = join(root, ".env");
  if (!existsSync(path)) {
    return;
  }
  for (const raw of readFileSync(path, "utf8").split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq < 1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

/**
 * Picks a LAN IPv4 from `ip -br a`, skipping loopback / docker / veth / vpn.
 * Override with LAN_IP=… (Tailscale IP works the same way).
 */
function detectLanIp() {
  if (process.env.LAN_IP) {
    return process.env.LAN_IP.trim();
  }
  const out = execSync("ip -br a", { encoding: "utf8" });
  for (const line of out.split("\n")) {
    const iface = line.split(/\s+/)[0] ?? "";
    if (!iface || iface === "lo" || /^(docker|br-|veth|virbr|cni|flannel|tailscale|tun|wg)/i.test(iface)) {
      continue;
    }
    const match = line.match(/\b(\d{1,3}(?:\.\d{1,3}){3})\//);
    if (match && !match[1].startsWith("127.")) {
      return match[1];
    }
  }
  throw new Error("Could not detect LAN IP. Re-run with LAN_IP=192.168.0.212 (or your Tailscale IP).");
}

/** Resolves when TCP connect to host:port succeeds, or rejects after timeoutMs. */
function waitForPort(host, port, timeoutMs = 20000) {
  const started = Date.now();
  return new Promise((resolve, reject) => {
    const attempt = () => {
      const socket = createConnection({ host, port }, () => {
        socket.end();
        resolve();
      });
      socket.on("error", () => {
        socket.destroy();
        if (Date.now() - started > timeoutMs) {
          reject(new Error(`timed out waiting for ${host}:${port}`));
          return;
        }
        setTimeout(attempt, 250);
      });
    };
    attempt();
  });
}

/** Returns true when something is already listening on the port. */
async function portOpen(host, port) {
  try {
    await waitForPort(host, port, 400);
    return true;
  } catch {
    return false;
  }
}

/** Spawns a workspace command, inheriting stdio, tracked for shutdown. */
function run(command, args, extraEnv) {
  const child = spawn(command, args, {
    cwd: root,
    stdio: "inherit",
    env: { ...process.env, ...extraEnv },
  });
  children.push(child);
  child.on("exit", (code, signal) => {
    if (signal === "SIGTERM" || signal === "SIGINT") return;
    if (code && code !== 0) {
      console.error(`${command} ${args.join(" ")} exited ${code}`);
      shutdown(code);
    }
  });
  return child;
}

/** Stops children and exits. */
function shutdown(code = 0) {
  for (const child of children) {
    if (!child.killed) {
      try {
        child.kill("SIGTERM");
      } catch {
        /* already gone */
      }
    }
  }
  process.exit(code);
}

/**
 * Starts embedded Postgres if 5433 is down, then Nest + Next with LAN CORS and API URL.
 */
async function main() {
  loadDotEnv();
  const lanIp = detectLanIp();
  const webUrl = `http://${lanIp}:${WEB_PORT}`;
  const apiUrl = `http://${lanIp}:${API_PORT}`;
  const origins = [
    "http://127.0.0.1:3010",
    "http://localhost:3010",
    `http://127.0.0.1:${WEB_PORT}`,
    `http://localhost:${WEB_PORT}`,
    webUrl,
  ];
  if (process.env.WEB_ORIGIN) {
    origins.push(...process.env.WEB_ORIGIN.split(",").map((item) => item.trim()).filter(Boolean));
  }
  const webOrigin = [...new Set(origins)].join(",");

  if (await portOpen("127.0.0.1", API_PORT)) {
    throw new Error(
      `port ${API_PORT} is already in use. Stop the existing API (ss -tlnp | grep ${API_PORT}) then retry.`,
    );
  }
  if (await portOpen("127.0.0.1", WEB_PORT)) {
    throw new Error(
      `port ${WEB_PORT} is already in use. Stop the existing web server then retry.`,
    );
  }

  if (!(await portOpen("127.0.0.1", PG_PORT))) {
    console.log(`Postgres not on ${PG_PORT}; starting npm run dev:pg`);
    run("npm", ["run", "dev:pg"]);
    await waitForPort("127.0.0.1", PG_PORT, 40000);
  }

  const apiEnv = {
    PORT: String(API_PORT),
    API_PORT: String(API_PORT),
    WEB_ORIGIN: webOrigin,
    NEXT_PUBLIC_API_URL: apiUrl,
    LAN_IP: lanIp,
  };
  const webEnv = {
    ...apiEnv,
    PORT: String(WEB_PORT),
    WEB_PORT: String(WEB_PORT),
  };

  console.log("Volleyball Manager LAN dev");
  console.log(`  LAN IP:     ${lanIp}`);
  console.log(`  PC browser: ${webUrl}`);
  console.log(`  API:        ${apiUrl}`);
  console.log(`  CORS:       WEB_ORIGIN includes ${webUrl}`);
  console.log("  Stop:       Ctrl+C (or tmux kill-session -t vm-lan)");

  run("npm", ["run", "start:dev", "-w", "@volleyball-manager/api-server"], apiEnv);
  await waitForPort("127.0.0.1", API_PORT, 35000);

  run("npm", ["run", "dev", "-w", "@volleyball-manager/web-client"], webEnv);
  await waitForPort("127.0.0.1", WEB_PORT, 35000);

  console.log(`Ready. Open ${webUrl} on the PC.`);
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  shutdown(1);
});
