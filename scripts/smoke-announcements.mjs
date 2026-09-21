#!/usr/bin/env node
/**
 * Smoke announcements: parent reads, coach writes, player cannot POST.
 */

import { expectStatus, json, login } from "./smoke-helpers.mjs";

/** Critical-path announcement board. */
async function main() {
  const coach = await login("coach@demo.local");
  const parent = await login("parent@demo.local");
  const player = await login("player@demo.local");

  const listed = await json("/announcements", { token: parent.token });
  if (!Array.isArray(listed.data) || !listed.data.some((row) => row.title.includes("Practice"))) {
    throw new Error("seeded announcement missing from parent list");
  }

  await expectStatus(403, () =>
    json("/announcements", {
      method: "POST",
      token: player.token,
      body: { title: "Nope", content: "Players cannot post." },
    }),
  );
  await expectStatus(401, () =>
    json("/announcements", {
      method: "POST",
      body: { title: "Nope", content: "Anonymous cannot post." },
    }),
  );

  const created = await json("/announcements", {
    method: "POST",
    token: coach.token,
    body: { title: "Film session", content: "Sunday 16:00 UTC in the classroom." },
  });
  if (created.data.title !== "Film session") {
    throw new Error("coach create failed");
  }

  const after = await json("/announcements", { token: parent.token });
  if (!after.data.some((row) => row.id === created.data.id)) {
    throw new Error("parent list missing the new post");
  }

  await json(`/announcements/${created.data.id}`, { method: "DELETE", token: coach.token });

  console.log("smoke-announcements: PASS");
  console.log(`  created=${created.data.id}`);
}

main().catch((err) => {
  console.error("smoke-announcements: FAIL");
  console.error(err);
  process.exit(1);
});
