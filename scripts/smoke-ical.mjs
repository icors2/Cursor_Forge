#!/usr/bin/env node
/**
 * Smoke iCal: public feed, UTC Z timestamps, no archived-season games on the active team.
 */

import { IDS, json } from "./smoke-helpers.mjs";

/** Asserts the Forge United feed is valid UTC iCal. */
async function main() {
  const { text, res } = await json(`/calendar/teams/${IDS.activeTeam}/feed.ics`, {
    accept: "text/calendar",
  });
  const type = res.headers.get("content-type") ?? "";
  if (!type.includes("text/calendar")) {
    throw new Error(`expected text/calendar, got ${type}`);
  }
  if (typeof text !== "string" || !text.includes("BEGIN:VCALENDAR")) {
    throw new Error("feed missing BEGIN:VCALENDAR");
  }
  if (!text.includes("TZID:UTC")) {
    throw new Error("feed must set TZID:UTC");
  }
  if (!text.includes("DTSTART:20260920T170000Z")) {
    throw new Error("Riverside kickoff must be 20260920T170000Z");
  }
  if (!text.includes("DTSTART:20260927T180000Z")) {
    throw new Error("Harbor kickoff must be 20260927T180000Z");
  }
  if (text.includes("Old Rivals") || text.includes("20251102T180000Z")) {
    throw new Error("archived-season game leaked into the active team feed");
  }
  const stamps = [...text.matchAll(/DTSTART:(\d{8}T\d{6}Z)/g)].map((m) => m[1]);
  if (stamps.length < 2) {
    throw new Error("expected at least two UTC DTSTART values");
  }

  await json(`/calendar/teams/00000000-0000-4000-8000-000000000000/feed.ics`, {
    accept: "text/calendar",
  }).then(
    () => {
      throw new Error("missing team should 404");
    },
    (err) => {
      if (err.status !== 404) throw err;
    },
  );

  console.log("smoke-ical: PASS");
  console.log(`  dtstart=${stamps.join(",")}`);
}

main().catch((err) => {
  console.error("smoke-ical: FAIL");
  console.error(err);
  process.exit(1);
});
