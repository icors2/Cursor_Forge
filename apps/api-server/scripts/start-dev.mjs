#!/usr/bin/env node
/**
 * Nest DI needs design:paramtypes from tsc (emitDecoratorMetadata).
 * tsx/esbuild omit that metadata, so constructor injection is undefined at runtime.
 * Build once, watch .ts → dist, and restart node when dist changes.
 */

import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const children = [];

/** Spawns a child that shares stdio; killed on shutdown. */
function run(command, args) {
  const child = spawn(command, args, {
    cwd: root,
    stdio: "inherit",
    env: process.env,
    shell: false,
  });
  children.push(child);
  child.on("exit", (code, signal) => {
    if (signal === "SIGTERM" || signal === "SIGINT") return;
    shutdown(code ?? 1);
  });
  return child;
}

/** Stops watchers and exits. */
function shutdown(code) {
  for (const child of children) {
    if (!child.killed) child.kill("SIGTERM");
  }
  process.exit(code);
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));

const tscJs = join(root, "node_modules/typescript/bin/tsc");
const tscBin = existsSync(tscJs) ? tscJs : join(root, "../../node_modules/typescript/bin/tsc");

const build = spawn(process.execPath, [tscBin, "-p", "tsconfig.json"], {
  cwd: root,
  stdio: "inherit",
  env: process.env,
});

build.on("exit", (code) => {
  if (code !== 0) {
    shutdown(code ?? 1);
    return;
  }
  run(process.execPath, [tscBin, "-p", "tsconfig.json", "-w", "--preserveWatchOutput"]);
  run(process.execPath, ["--watch", "dist/main.js"]);
});
