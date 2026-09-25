#!/usr/bin/env node
/**
 * Starts an embedded Postgres for Cloud/local smoke when Docker is unavailable.
 * Writes connection details to stdout. Data lives in .local-pg/ (gitignored).
 */

import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import EmbeddedPostgres from "embedded-postgres";

const port = Number(process.env.PG_PORT ?? 5433);
const user = process.env.POSTGRES_USER ?? "volleyball";
const password = process.env.POSTGRES_PASSWORD ?? "volleyball";
const database = process.env.POSTGRES_DB ?? "volleyball";
const databaseDir = join(process.cwd(), ".local-pg");

mkdirSync(databaseDir, { recursive: true });

const pg = new EmbeddedPostgres({
  databaseDir,
  user,
  password,
  port,
  persistent: true,
});

if (!existsSync(join(databaseDir, "PG_VERSION"))) {
  await pg.initialise();
}
await pg.start();

try {
  await pg.createDatabase(database);
} catch (err) {
  const message = err instanceof Error ? err.message : String(err);
  if (!/already exists/i.test(message)) {
    throw err;
  }
}

const url = `postgresql://${user}:${password}@127.0.0.1:${port}/${database}`;
console.log(`EMBEDDED_POSTGRES_URL=${url}`);

const keepAlive = process.argv.includes("--keep");
if (!keepAlive) {
  await pg.stop();
} else {
  const stop = async () => {
    await pg.stop();
    process.exit(0);
  };
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
  console.log("embedded postgres running; Ctrl+C to stop");
}
