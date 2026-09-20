#!/usr/bin/env node
/**
 * Runs `prisma generate` with a dummy DATABASE_URL if none is set.
 * Generate does not connect; the schema still requires the env name.
 */

import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const cwd = join(dirname(fileURLToPath(import.meta.url)), "../packages/database");
const env = {
  ...process.env,
  DATABASE_URL: process.env.DATABASE_URL ?? "postgresql://postgres:postgres@127.0.0.1:5432/postgres",
};

const result = spawnSync("npx", ["prisma", "generate"], {
  cwd,
  env,
  stdio: "inherit",
  shell: false,
});

process.exit(result.status ?? 1);
