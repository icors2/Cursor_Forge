#!/usr/bin/env node
/**
 * Smoke season archive: ADMIN archiveSeason, default queries empty, historical still works.
 * Restores the demo by re-running the seed (single active season = Fall 2026).
 */

import { spawnSync } from "node:child_process";
import { expectStatus, IDS, json, login } from "./smoke-helpers.mjs";

/** Critical-path archiveSeason + historical flags. */
async function main() {
  const admin = await login("admin@demo.local");
  const coach = await login("coach@demo.local");
  const parent = await login("parent@demo.local");

  await expectStatus(403, () =>
    json("/seasons/archive", {
      method: "POST",
      token: coach.token,
      body: { name: "Nope 2099", year: 2099 },
    }),
  );

  const beforeGames = await json("/games", { token: parent.token });
  if (!beforeGames.data.some((game) => game.opponent === "Riverside")) {
    throw new Error("precondition: Riverside should be in the active season");
  }

  const archived = await json("/seasons/archive", {
    method: "POST",
    token: admin.token,
    body: { name: "Smoke Season", year: 2099 },
  });
  if (!archived.data.archived || archived.data.archived.isActive !== false) {
    throw new Error("archived season should be inactive");
  }
  if (!archived.data.created?.isActive || archived.data.created.name !== "Smoke Season") {
    throw new Error("new season should be active and empty");
  }

  const afterGames = await json("/games", { token: parent.token });
  if (afterGames.data.some((game) => game.opponent === "Riverside")) {
    throw new Error("active-season default leaked archived games after archive");
  }

  const historical = await json(`/games?historical=true&seasonId=${IDS.activeSeason}`, {
    token: coach.token,
  });
  if (!historical.data.some((game) => game.opponent === "Riverside")) {
    throw new Error("historical query should still return Fall 2026 games");
  }

  const fall2025 = await json(`/games?historical=true&seasonId=${IDS.archivedSeason}`, {
    token: coach.token,
  });
  if (!fall2025.data.some((game) => game.opponent === "Old Rivals")) {
    throw new Error("historical Fall 2025 should still include Old Rivals");
  }

  const restore = spawnSync("npm", ["run", "db:seed"], { stdio: "inherit" });
  if (restore.status !== 0) {
    throw new Error("seed restore after archive failed");
  }

  const restored = await json("/games", { token: parent.token });
  if (!restored.data.some((game) => game.opponent === "Riverside")) {
    throw new Error("seed did not restore Fall 2026 as the active season");
  }

  console.log("smoke-archive: PASS");
  console.log(`  created=${archived.data.created.id}`);
}

main().catch((err) => {
  console.error("smoke-archive: FAIL");
  console.error(err);
  process.exit(1);
});
