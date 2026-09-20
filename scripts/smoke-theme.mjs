#!/usr/bin/env node
/**
 * Smoke per-account theme: ADMIN PATCH /users/:id/theme; others 403; /auth/me returns themeColor.
 */

import { expectStatus, json, login } from "./smoke-helpers.mjs";

const ADMIN_THEME = "#f59e0b";
const COACH_THEME = "#38bdf8";
const DEFAULT_THEME = "#3dcf8e";

/** Critical-path theme isolation. */
async function main() {
  const admin = await login("admin@demo.local");
  const coach = await login("coach@demo.local");
  const parent = await login("parent@demo.local");

  if (admin.user.themeColor !== ADMIN_THEME) {
    throw new Error(`admin seed theme should be ${ADMIN_THEME}, got ${admin.user.themeColor}`);
  }
  if (coach.user.themeColor !== COACH_THEME) {
    throw new Error(`coach seed theme should be ${COACH_THEME}, got ${coach.user.themeColor}`);
  }

  const me = await json("/auth/me", { token: coach.token });
  if (me.data.themeColor !== COACH_THEME) {
    throw new Error("/auth/me should return the account themeColor");
  }

  await expectStatus(401, () =>
    json(`/users/${coach.user.id}/theme`, {
      method: "PATCH",
      body: { themeColor: "#ff00aa" },
    }),
  );
  await expectStatus(403, () =>
    json(`/users/${parent.user.id}/theme`, {
      method: "PATCH",
      token: coach.token,
      body: { themeColor: "#ff00aa" },
    }),
  );
  await expectStatus(403, () =>
    json(`/users/${coach.user.id}/theme`, {
      method: "PATCH",
      token: parent.token,
      body: { themeColor: "#ff00aa" },
    }),
  );
  await expectStatus(400, () =>
    json(`/users/${parent.user.id}/theme`, {
      method: "PATCH",
      token: admin.token,
      body: { themeColor: "red" },
    }),
  );

  const patched = await json(`/users/${parent.user.id}/theme`, {
    method: "PATCH",
    token: admin.token,
    body: { themeColor: "#FF00AA" },
  });
  if (patched.data.themeColor !== "#ff00aa") {
    throw new Error("ADMIN theme write should persist lowercase #rrggbb");
  }

  const parentAgain = await login("parent@demo.local");
  if (parentAgain.user.themeColor !== "#ff00aa") {
    throw new Error("login payload should include the updated themeColor");
  }

  const restored = await json(`/users/${parent.user.id}/theme`, {
    method: "PATCH",
    token: admin.token,
    body: { themeColor: DEFAULT_THEME },
  });
  if (restored.data.themeColor !== DEFAULT_THEME) {
    throw new Error("could not restore parent theme");
  }

  const directory = await json("/users", { token: admin.token });
  const adminRow = directory.data.find((row) => row.email === "admin@demo.local");
  const coachRow = directory.data.find((row) => row.email === "coach@demo.local");
  if (!adminRow || adminRow.themeColor !== ADMIN_THEME) {
    throw new Error("ADMIN directory missing admin amber theme");
  }
  if (!coachRow || coachRow.themeColor !== COACH_THEME) {
    throw new Error("ADMIN directory missing coach sky theme");
  }

  console.log("smoke-theme: PASS");
}

main().catch((err) => {
  console.error("smoke-theme: FAIL");
  console.error(err);
  process.exit(1);
});
