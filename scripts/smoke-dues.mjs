#!/usr/bin/env node
/**
 * Smoke dues admin: only ADMIN can PATCH /users/:id/dues; unpaid parent cannot volunteer.
 */

import { expectStatus, IDS, json, login } from "./smoke-helpers.mjs";

/** Critical-path dues isolation. */
async function main() {
  const admin = await login("admin@demo.local");
  const parent = await login("parent@demo.local");
  const unpaid = await login("parent-unpaid@demo.local");
  const coach = await login("coach@demo.local");

  if (unpaid.user.isDuesPaid) {
    throw new Error("parent-unpaid should start with isDuesPaid=false");
  }

  await expectStatus(403, () => json("/users", { token: parent.token }));
  await expectStatus(403, () =>
    json(`/users/${unpaid.user.id}/dues`, {
      method: "PATCH",
      token: parent.token,
      body: { isDuesPaid: true },
    }),
  );
  await expectStatus(403, () =>
    json(`/users/${unpaid.user.id}/dues`, {
      method: "PATCH",
      token: coach.token,
      body: { isDuesPaid: true },
    }),
  );

  // Privilege-escalation probe: a generic user PATCH must not exist.
  await expectStatus(404, () =>
    json(`/users/${parent.user.id}`, {
      method: "PATCH",
      token: parent.token,
      body: { isDuesPaid: true, firstName: "Hacked" },
    }),
  );

  await expectStatus(403, () =>
    json(`/volunteer/slots/${IDS.concessions}/registrations`, {
      method: "POST",
      token: unpaid.token,
    }),
  );

  const paid = await json(`/users/${unpaid.user.id}/dues`, {
    method: "PATCH",
    token: admin.token,
    body: { isDuesPaid: true },
  });
  if (!paid.data.isDuesPaid) {
    throw new Error("ADMIN dues toggle failed");
  }

  const unpaidAgain = await json(`/users/${unpaid.user.id}/dues`, {
    method: "PATCH",
    token: admin.token,
    body: { isDuesPaid: false },
  });
  if (unpaidAgain.data.isDuesPaid) {
    throw new Error("ADMIN should be able to clear dues");
  }

  const rosterReject = await json(`/teams/${IDS.activeTeam}/roster`, {
    method: "POST",
    token: admin.token,
    body: { userId: IDS.playerUnpaid, jerseyNum: 99 },
  }).then(
    () => {
      throw new Error("unpaid player should not join a live roster");
    },
    (err) => err,
  );
  if (rosterReject.status !== 400) {
    throw new Error(`expected 400 adding unpaid player, got ${rosterReject.status}`);
  }

  const directory = await json("/users", { token: admin.token });
  if (!directory.data.some((row) => row.email === "parent-unpaid@demo.local" && row.isDuesPaid === false)) {
    throw new Error("ADMIN directory missing unpaid parent");
  }

  console.log("smoke-dues: PASS");
}

main().catch((err) => {
  console.error("smoke-dues: FAIL");
  console.error(err);
  process.exit(1);
});
