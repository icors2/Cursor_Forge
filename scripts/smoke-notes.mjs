#!/usr/bin/env node
/**
 * Smoke coach notes: COACH write, PARENT/PLAYER 403, note body not required on list.
 */

import { expectStatus, IDS, json, login } from "./smoke-helpers.mjs";

/** Critical-path private notes. */
async function main() {
  const coach = await login("coach@demo.local");
  const parent = await login("parent@demo.local");
  const player = await login("player@demo.local");

  await expectStatus(403, () => json("/notes", { token: parent.token }));
  await expectStatus(403, () => json("/notes", { token: player.token }));

  const listed = await json("/notes", { token: coach.token });
  if (!Array.isArray(listed.data) || listed.data.length < 1) {
    throw new Error("coach should see the seeded note");
  }

  const created = await json("/notes", {
    method: "POST",
    token: coach.token,
    body: { playerId: IDS.player, content: "Serve receive improved on float serves." },
  });
  if (!created.data.id || created.data.playerId !== IDS.player) {
    throw new Error("coach note create failed");
  }

  const filtered = await json(`/notes?playerId=${IDS.player}`, { token: coach.token });
  if (!filtered.data.some((row) => row.id === created.data.id)) {
    throw new Error("playerId filter missed the new note");
  }

  await json(`/notes/${created.data.id}`, { method: "DELETE", token: coach.token });

  console.log("smoke-notes: PASS");
  console.log(`  note=${created.data.id}`);
}

main().catch((err) => {
  console.error("smoke-notes: FAIL");
  console.error(err);
  process.exit(1);
});
