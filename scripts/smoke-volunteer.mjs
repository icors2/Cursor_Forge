#!/usr/bin/env node
/**
 * Smoke volunteer + capacity lock.
 * Usage: API_URL=http://127.0.0.1:4010 node scripts/smoke-volunteer.mjs
 */

const apiUrl = process.env.API_URL ?? "http://127.0.0.1:4010";
const password = "Demo1234!";
const concessionsId = "88888888-8888-4888-8888-888888888888";
const archivedSeasonId = "11111111-1111-4111-8111-111111111111";

/** JSON helper that throws on non-2xx. */
async function json(path, { method = "GET", token, body } = {}) {
  const headers = { Accept: "application/json" };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${apiUrl}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!res.ok) {
    const err = new Error(`${method} ${path} -> ${res.status}`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

/** Extracts the JWT from the login cookie. */
async function login(email) {
  const res = await fetch(`${apiUrl}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`login ${email} -> ${res.status}`);
  const setCookie = res.headers.getSetCookie?.() ?? [];
  const cookie = setCookie.find((c) => c.startsWith("access_token="));
  const token = cookie
    ? decodeURIComponent(cookie.slice("access_token=".length).split(";")[0])
    : null;
  if (!token) throw new Error(`login ${email} did not set access_token cookie`);
  return { user: data.user, token };
}

/** Expects an HTTP error status. */
async function expectStatus(status, fn) {
  try {
    await fn();
  } catch (err) {
    if (err.status === status) return;
    throw new Error(`expected ${status}, got ${err.status ?? err.message}`);
  }
  throw new Error(`expected ${status}, request succeeded`);
}

/** Volunteer assertions: list, PARENT signup, 409 on full, RBAC, season scope. */
async function main() {
  const admin = await login("admin@demo.local");
  const coach = await login("coach@demo.local");
  const parent = await login("parent@demo.local");
  const parent2 = await login("parent2@demo.local");
  const player = await login("player@demo.local");

  const slots = await json("/volunteer/slots", { token: parent.token });
  if (!Array.isArray(slots) || slots.length < 2) {
    throw new Error(`expected at least 2 active slots, got ${JSON.stringify(slots)}`);
  }
  if (slots.some((slot) => slot.title === "Legacy Concessions")) {
    throw new Error("archived volunteer slot leaked into the default list");
  }
  const concessions = slots.find((slot) => slot.id === concessionsId);
  if (!concessions || concessions.capacity !== 1) {
    throw new Error("seeded Concessions slot (cap 1) missing");
  }

  const historical = await json(
    `/volunteer/slots?historical=true&seasonId=${archivedSeasonId}`,
    { token: parent.token },
  );
  if (!historical.some((slot) => slot.title === "Legacy Concessions")) {
    throw new Error("historical query should return the archived slot");
  }

  await expectStatus(401, () =>
    json(`/volunteer/slots/${concessionsId}/registrations`, { method: "POST" }),
  );
  await expectStatus(403, () =>
    json(`/volunteer/slots/${concessionsId}/registrations`, {
      method: "POST",
      token: player.token,
    }),
  );
  await expectStatus(403, () =>
    json(`/volunteer/slots/${concessionsId}/registrations`, {
      method: "POST",
      token: coach.token,
    }),
  );
  await expectStatus(403, () =>
    json("/volunteer/slots", {
      method: "POST",
      token: coach.token,
      body: {
        title: "Nope",
        startTime: "2026-09-22T16:00:00.000Z",
        endTime: "2026-09-22T18:00:00.000Z",
        capacity: 1,
      },
    }),
  );

  if (!concessions.registered) {
    const first = await json(`/volunteer/slots/${concessionsId}/registrations`, {
      method: "POST",
      token: parent.token,
    });
    if (!first?.id) throw new Error("parent signup failed");
  }

  await expectStatus(409, () =>
    json(`/volunteer/slots/${concessionsId}/registrations`, {
      method: "POST",
      token: parent.token,
    }),
  );
  await expectStatus(409, () =>
    json(`/volunteer/slots/${concessionsId}/registrations`, {
      method: "POST",
      token: parent2.token,
    }),
  );

  const created = await json("/volunteer/slots", {
    method: "POST",
    token: admin.token,
    body: {
      title: "Libero tracker",
      startTime: "2026-09-22T16:00:00.000Z",
      endTime: "2026-09-22T18:00:00.000Z",
      capacity: 2,
    },
  });
  if (created.title !== "Libero tracker" || created.taken !== 0) {
    throw new Error("admin create slot failed");
  }

  const after = await json("/volunteer/slots", { token: parent.token });
  const filled = after.find((slot) => slot.id === concessionsId);
  if (!filled || filled.taken !== 1 || filled.taken > filled.capacity) {
    throw new Error("capacity lock failed — overbook or missing registration");
  }

  console.log("smoke-volunteer: PASS");
  console.log(`  concessions=${concessionsId} taken=${filled.taken}/${filled.capacity}`);
}

main().catch((err) => {
  console.error("smoke-volunteer: FAIL");
  console.error(err);
  process.exit(1);
});
