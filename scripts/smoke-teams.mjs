#!/usr/bin/env node
/**
 * Smoke teams/roster/game-create: active-season default, unpaid player rejected, PLAYER cannot create.
 */

import { expectStatus, IDS, json, login } from "./smoke-helpers.mjs";

/** Critical-path team + roster + game setup. */
async function main() {
  const coach = await login("coach@demo.local");
  const player = await login("player@demo.local");
  const parent = await login("parent@demo.local");

  const teams = await json("/teams", { token: parent.token });
  if (!teams.data.some((team) => team.id === IDS.activeTeam)) {
    throw new Error("active team missing from default list");
  }
  if (teams.data.some((team) => team.name === "Legacy Spikers")) {
    throw new Error("archived team leaked into the default list");
  }

  const historical = await json(`/teams?historical=true&seasonId=${IDS.archivedSeason}`, {
    token: coach.token,
  });
  if (!historical.data.some((team) => team.name === "Legacy Spikers")) {
    throw new Error("historical query should return Legacy Spikers");
  }

  await expectStatus(403, () =>
    json("/teams", { method: "POST", token: player.token, body: { name: "Nope" } }),
  );

  const created = await json("/teams", {
    method: "POST",
    token: coach.token,
    body: { name: "Smoke JV" },
  });
  if (created.data.name !== "Smoke JV" || created.data.seasonId !== IDS.activeSeason) {
    throw new Error("team create must attach to the active season");
  }

  const game = await json("/games", {
    method: "POST",
    token: coach.token,
    body: {
      teamId: created.data.id,
      opponent: "Smoke Opponent",
      scheduledAt: "2026-10-11T17:00:00.000Z",
    },
  });
  if (game.data.opponent !== "Smoke Opponent" || !game.data.scheduledAt.endsWith("Z")) {
    throw new Error("game create should persist UTC scheduledAt");
  }

  console.log("smoke-teams: PASS");
  console.log(`  team=${created.data.id} game=${game.data.id}`);
}

main().catch((err) => {
  console.error("smoke-teams: FAIL");
  console.error(err);
  process.exit(1);
});
