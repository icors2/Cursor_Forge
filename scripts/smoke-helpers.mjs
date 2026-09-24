/**
 * Shared JSON + login helpers for module smoke scripts.
 */

const apiUrl = process.env.API_URL ?? "http://127.0.0.1:4010";
const password = "Demo1234!";

/** JSON helper that throws on non-2xx and attaches status. */
export async function json(path, { method = "GET", token, body, accept } = {}) {
  const headers = { Accept: accept ?? "application/json" };
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
  return { data, res, text };
}

/** Login via JSON and return the access_token cookie value. */
export async function login(email) {
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

/** Expects an HTTP error status from an async function. */
export async function expectStatus(status, fn) {
  try {
    await fn();
  } catch (err) {
    if (err.status === status) return;
    throw new Error(`expected ${status}, got ${err.status ?? err.message}`);
  }
  throw new Error(`expected ${status}, request succeeded`);
}

/** Seeded ids used by multiple smokes. */
export const IDS = {
  archivedSeason: "11111111-1111-4111-8111-111111111111",
  activeSeason: "22222222-2222-4222-8222-222222222222",
  activeTeam: "44444444-4444-4444-8444-444444444444",
  jvTeam: "45454545-4545-4545-8545-454545454545",
  msTeam: "46464646-4646-4646-8646-464646464646",
  activeGame: "66666666-6666-4666-8666-666666666666",
  announcement: "b1b1b1b1-b1b1-41b1-81b1-b1b1b1b1b1b1",
  player: "dddddddd-dddd-dddd-dddd-dddddddddddd",
  playerUnpaid: "20202020-2020-4202-8202-202020202020",
  parentUnpaid: "10101010-1010-4101-8101-101010101010",
  concessions: "88888888-8888-4888-8888-888888888888",
};

export { apiUrl };
