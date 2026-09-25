#!/usr/bin/env node
/**
 * Smoke Wave 2: public PARENT/PLAYER register, one-time coach key signup, team apply, pool, ADMIN role.
 */

import { expectStatus, IDS, json, login } from "./smoke-helpers.mjs";

const stamp = Date.now();
const playerEmail = `smoke-player-${stamp}@demo.local`;
const childEmail = `smoke-child-${stamp}@demo.local`;

/** Critical-path registration + pool + roster position. */
async function main() {
  const admin = await login("admin@demo.local");
  const coach = await login("coach@demo.local");

  await expectStatus(400, () =>
    json("/auth/register", {
      method: "POST",
      body: {
        email: `smoke-admin-${stamp}@demo.local`,
        password: "Demo1234!",
        firstName: "Nope",
        lastName: "Admin",
        role: "ADMIN",
      },
    }),
  );

  await expectStatus(403, () =>
    json("/auth/coach-keys", {
      method: "POST",
      token: coach.token,
      body: { label: "Nope" },
    }),
  );
  await expectStatus(400, () =>
    json("/auth/register", {
      method: "POST",
      body: {
        email: `smoke-coach-nokey-${stamp}@demo.local`,
        password: "Demo1234!",
        firstName: "No",
        lastName: "Key",
        role: "COACH",
      },
    }),
  );
  await expectStatus(401, () =>
    json("/auth/register", {
      method: "POST",
      body: {
        email: `smoke-coach-badkey-${stamp}@demo.local`,
        password: "Demo1234!",
        firstName: "Bad",
        lastName: "Key",
        role: "COACH",
        coachKey: "vmck_not-a-real-invite-key",
      },
    }),
  );

  const generated = await json("/auth/coach-keys", {
    method: "POST",
    token: admin.token,
    body: { label: "Smoke coach" },
  });
  if (typeof generated.data.key !== "string" || !generated.data.key.startsWith("vmck_")) {
    throw new Error("ADMIN keygen must return a plaintext vmck_ key once");
  }
  const listed = await json("/auth/coach-keys", { token: admin.token });
  if (listed.data.some((row) => "key" in row || "keyHash" in row)) {
    throw new Error("coach key list must never include plaintext or hash");
  }
  if (!listed.data.some((row) => row.id === generated.data.id && row.usedAt === null)) {
    throw new Error("generated coach key should appear unused");
  }

  const coachReg = await json("/auth/register", {
    method: "POST",
    body: {
      email: `smoke-coach-${stamp}@demo.local`,
      password: "Demo1234!",
      firstName: "Keyed",
      lastName: "Coach",
      role: "COACH",
      coachKey: generated.data.key,
    },
  });
  if (coachReg.data.user.role !== "COACH") {
    throw new Error("valid coach key should create a COACH");
  }
  await expectStatus(401, () =>
    json("/auth/register", {
      method: "POST",
      body: {
        email: `smoke-coach-reuse-${stamp}@demo.local`,
        password: "Demo1234!",
        firstName: "Reuse",
        lastName: "Key",
        role: "COACH",
        coachKey: generated.data.key,
      },
    }),
  );

  const extraKey = await json("/auth/coach-keys", {
    method: "POST",
    token: admin.token,
    body: { label: "Revoke me" },
  });
  await json(`/auth/coach-keys/${extraKey.data.id}`, { method: "DELETE", token: admin.token });

  const registered = await json("/auth/register", {
    method: "POST",
    body: {
      email: playerEmail,
      password: "Demo1234!",
      firstName: "Sky",
      lastName: "Applicant",
      role: "PLAYER",
    },
  });
  if (registered.data.user.role !== "PLAYER" || registered.data.user.isDuesPaid) {
    throw new Error("public register must create an unpaid PLAYER");
  }
  const playerToken = registered.res.headers.getSetCookie?.()?.find((c) => c.startsWith("access_token="));
  const newPlayerToken = playerToken
    ? decodeURIComponent(playerToken.slice("access_token=".length).split(";")[0])
    : null;
  if (!newPlayerToken) {
    throw new Error("register did not set access_token");
  }

  const createdTeam = await json("/teams", {
    method: "POST",
    token: coach.token,
    body: { name: `Wave2 ${stamp}` },
  });
  const opened = await json("/registrations", {
    method: "POST",
    token: coach.token,
    body: { teamId: createdTeam.data.id },
  });
  if (!opened.data.isOpen || opened.data.teamId !== createdTeam.data.id) {
    throw new Error("coach should create a team and open registration");
  }

  await expectStatus(403, () =>
    json(`/registrations/${opened.data.id}/applications`, {
      method: "POST",
      token: coach.token,
      body: { playerFirstName: "Nope", playerLastName: "Coach" },
    }),
  );

  const applied = await json(`/registrations/${opened.data.id}/applications`, {
    method: "POST",
    token: newPlayerToken,
    body: { preferredPosition: "OH" },
  });
  if (applied.data.status !== "PENDING" || applied.data.preferredPosition !== "OH") {
    throw new Error("player apply should land in the pool as PENDING");
  }

  const parentReg = await json("/auth/register", {
    method: "POST",
    body: {
      email: `smoke-parent-${stamp}@demo.local`,
      password: "Demo1234!",
      firstName: "Pat",
      lastName: "Guardian",
      role: "PARENT",
    },
  });
  const parentCookie = parentReg.res.headers.getSetCookie?.()?.find((c) => c.startsWith("access_token="));
  const newParentToken = parentCookie
    ? decodeURIComponent(parentCookie.slice("access_token=".length).split(";")[0])
    : null;
  if (!newParentToken) {
    throw new Error("parent register did not set access_token");
  }

  const parentApply = await json(`/registrations/${opened.data.id}/applications`, {
    method: "POST",
    token: newParentToken,
    body: {
      playerFirstName: "Chris",
      playerLastName: "Child",
      playerEmail: childEmail,
      preferredPosition: "L",
      note: "Libero prospect",
    },
  });
  if (parentApply.data.applicantRole !== "PARENT") {
    throw new Error("parent apply should keep PARENT as applicant");
  }

  await expectStatus(403, () =>
    json(`/registrations/${opened.data.id}/applications/${applied.data.id}/accept`, {
      method: "POST",
      token: newParentToken,
      body: { jerseyNum: 4, position: "OH" },
    }),
  );

  const accepted = await json(`/registrations/${opened.data.id}/applications/${applied.data.id}/accept`, {
    method: "POST",
    token: coach.token,
    body: { jerseyNum: 4, position: "OH" },
  });
  if (accepted.data.application.status !== "ACCEPTED" || accepted.data.roster.position !== "OH") {
    throw new Error("accept should promote to roster with position");
  }

  const team = await json(`/teams/${createdTeam.data.id}`, { token: coach.token });
  const rostered = team.data.roster.find((row) => row.userId === registered.data.user.id);
  if (!rostered || rostered.position !== "OH") {
    throw new Error("new team roster should include the accepted player at OH");
  }

  const moved = await json(`/teams/${createdTeam.data.id}/roster/${rostered.id}`, {
    method: "PATCH",
    token: coach.token,
    body: { position: "DS" },
  });
  if (moved.data.position !== "DS") {
    throw new Error("PATCH roster position should persist");
  }

  const seeded = await json(`/registrations`, { token: coach.token });
  const jv = seeded.data.find((row) => row.teamId === IDS.jvTeam);
  if (!jv || !jv.isOpen) {
    throw new Error("seed should keep JV registration open");
  }
  const jvDetail = await json(`/registrations/${jv.id}`, { token: coach.token });
  if (!jvDetail.data.applications.some((row) => row.playerEmail === "quinn-pool@demo.local")) {
    throw new Error("seeded Quinn Pool application should appear in the JV pool");
  }

  const provisioned = await json("/users", {
    method: "POST",
    token: admin.token,
    body: {
      email: `smoke-role-${stamp}@demo.local`,
      password: "Demo1234!",
      firstName: "Role",
      lastName: "Flip",
      role: "PLAYER",
    },
  });
  const flipped = await json(`/users/${provisioned.data.id}/role`, {
    method: "PATCH",
    token: admin.token,
    body: { role: "COACH" },
  });
  if (flipped.data.role !== "COACH") {
    throw new Error("ADMIN role PATCH should stick");
  }
  await expectStatus(403, () =>
    json(`/users/${provisioned.data.id}/role`, {
      method: "PATCH",
      token: coach.token,
      body: { role: "ADMIN" },
    }),
  );

  const sub = await json("/calendar/subscription", { token: admin.token });
  if (sub.data === null || (sub.data.url !== null && typeof sub.data.url !== "string")) {
    throw new Error("calendar subscription should be a JSON object with url or null url");
  }

  console.log("smoke-registration: PASS");
  console.log(`  registration=${opened.data.id} player=${registered.data.user.id}`);
}

main().catch((err) => {
  console.error("smoke-registration: FAIL");
  console.error(err);
  if (err.data) console.error(err.data);
  process.exitCode = 1;
});
