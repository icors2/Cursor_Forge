#!/usr/bin/env node
/**
 * Smoke the live-stat first slice without a browser.
 * Usage: API_URL=http://127.0.0.1:4010 node scripts/smoke-first-slice.mjs
 */

import { io } from "socket.io-client";

const apiUrl = process.env.API_URL ?? "http://127.0.0.1:4010";
const password = "Demo1234!";

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

/** Login via JSON; prefers Set-Cookie, falls back to a second Bearer login path. */
async function login(email) {
  const res = await fetch(`${apiUrl}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(`login ${email} -> ${res.status}`);
  }
  const setCookie = res.headers.getSetCookie?.() ?? [];
  const cookie = setCookie.find((c) => c.startsWith("access_token="));
  const token = cookie
    ? decodeURIComponent(cookie.slice("access_token=".length).split(";")[0])
    : null;
  if (!token) {
    throw new Error(`login ${email} did not set access_token cookie`);
  }
  return { user: data.user, token };
}

/** Runs the first-slice assertions. */
async function main() {
  const health = await json("/health");
  if (!health?.ok) throw new Error("health failed");

  const coach = await login("coach@demo.local");
  const parent = await login("parent@demo.local");
  const player = await login("player@demo.local");
  if (coach.user.role !== "COACH") throw new Error("coach role mismatch");
  if (parent.user.role !== "PARENT") throw new Error("parent role mismatch");

  const games = await json("/games", { token: coach.token });
  if (!Array.isArray(games) || games.length !== 1) {
    throw new Error(`expected 1 active-season game, got ${JSON.stringify(games)}`);
  }
  if (games[0].opponent === "Old Rivals") {
    throw new Error("archived season game leaked into default list");
  }
  const gameId = games[0].id;

  const detail = await json(`/games/${gameId}`, { token: coach.token });
  const rosterId = detail.roster?.[0]?.id;
  if (!rosterId) throw new Error("seed roster missing");
  const before = detail.stats.length;

  let anonFailed = false;
  try {
    await json("/stats", { method: "POST", body: { gameId, rosterId, type: "KILL" } });
  } catch (err) {
    anonFailed = err.status === 401;
  }
  if (!anonFailed) throw new Error("anonymous POST /stats should 401");

  let playerFailed = false;
  try {
    await json("/stats", {
      method: "POST",
      token: player.token,
      body: { gameId, rosterId, type: "KILL" },
    });
  } catch (err) {
    playerFailed = err.status === 403;
  }
  if (!playerFailed) throw new Error("PLAYER POST /stats should 403");

  const created = await json("/stats", {
    method: "POST",
    token: coach.token,
    body: { gameId, rosterId, type: "KILL" },
  });
  if (!created?.id || created.type !== "KILL") throw new Error("coach stat insert failed");

  const listed = await json(`/stats?gameId=${gameId}`, { token: parent.token });
  if (!listed.some((row) => row.id === created.id)) {
    throw new Error("parent list did not include the new Stat row");
  }
  if (listed.length !== before + 1) {
    throw new Error(`expected ${before + 1} events, got ${listed.length}`);
  }

  const archivedSeasonId = "11111111-1111-4111-8111-111111111111";
  const historical = await json(`/games?historical=true&seasonId=${archivedSeasonId}`, {
    token: coach.token,
  });
  if (!historical.some((game) => game.opponent === "Old Rivals")) {
    throw new Error("historical query should return the archived game");
  }

  const received = [];
  const socket = io(apiUrl, { auth: { token: parent.token }, transports: ["websocket"] });
  await new Promise((resolve, reject) => {
    socket.on("connect", resolve);
    socket.on("connect_error", reject);
    setTimeout(() => reject(new Error("socket connect timeout")), 5000);
  });
  socket.emit("game:join", { gameId });
  socket.on("stat.created", (event) => received.push(event));
  await new Promise((r) => setTimeout(r, 200));
  const live = await json("/stats", {
    method: "POST",
    token: coach.token,
    body: { gameId, rosterId, type: "BLOCK" },
  });
  await new Promise((r) => setTimeout(r, 400));
  socket.disconnect();
  if (!received.some((event) => event.id === live.id)) {
    throw new Error("parent socket did not receive stat.created");
  }

  console.log("smoke-first-slice: PASS");
  console.log(`  game=${gameId} stat=${created.id} live=${live.id} events=${listed.length + 1}`);
}

main().catch((err) => {
  console.error("smoke-first-slice: FAIL");
  console.error(err);
  process.exit(1);
});
