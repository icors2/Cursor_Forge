#!/usr/bin/env node
/**
 * Smoke multi-team ICS import: Varsity + JV mapping, commit, PATCH edit, parent 403.
 */

import { expectStatus, IDS, json, login } from "./smoke-helpers.mjs";

const FIXTURE = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Smoke//EN
BEGIN:VEVENT
UID:smoke-varsity-riverside
DTSTART:20261018T170000Z
DTEND:20261018T190000Z
SUMMARY:Forge United vs Import Riverside
END:VEVENT
BEGIN:VEVENT
UID:smoke-jv-harbor
DTSTART:20261019T180000Z
SUMMARY:Forge United JV vs Import Harbor
END:VEVENT
END:VCALENDAR
`;

/** Critical-path ICS preview/commit + mapping edit. */
async function main() {
  const coach = await login("coach@demo.local");
  const parent = await login("parent@demo.local");

  await expectStatus(403, () =>
    json("/calendar/import/preview", {
      method: "POST",
      token: parent.token,
      body: { icsText: FIXTURE },
    }),
  );

  const preview = await json("/calendar/import/preview", {
    method: "POST",
    token: coach.token,
    body: { icsText: FIXTURE },
  });
  const varsity = preview.data.events.find((row) => row.uid === "smoke-varsity-riverside");
  const jv = preview.data.events.find((row) => row.uid === "smoke-jv-harbor");
  if (!varsity || varsity.suggestedTeamId !== IDS.activeTeam) {
    throw new Error("Varsity event should map to Forge United");
  }
  if (!jv || jv.suggestedTeamId !== IDS.jvTeam) {
    throw new Error("JV event should map to Forge United JV");
  }
  if (!varsity.suggestedOpponent.includes("Riverside") || !jv.suggestedOpponent.includes("Harbor")) {
    throw new Error("opponents should parse from SUMMARY vs tokens");
  }

  const committed = await json("/calendar/import/commit", {
    method: "POST",
    token: coach.token,
    body: {
      events: [
        {
          uid: varsity.uid,
          teamId: varsity.suggestedTeamId,
          opponent: varsity.suggestedOpponent,
          scheduledAt: varsity.scheduledAt,
        },
        {
          uid: jv.uid,
          teamId: jv.suggestedTeamId,
          opponent: jv.suggestedOpponent,
          scheduledAt: jv.scheduledAt,
        },
      ],
    },
  });
  if (committed.data.games.length !== 2) {
    throw new Error("commit should upsert two games");
  }

  const listed = await json("/games", { token: parent.token });
  if (!listed.data.some((game) => game.opponent.includes("Import Riverside"))) {
    throw new Error("imported varsity game missing from GET /games");
  }

  const imported = committed.data.games.find((game) => game.opponent.includes("Harbor"));
  const patched = await json(`/games/${imported.id}`, {
    method: "PATCH",
    token: coach.token,
    body: { opponent: "Harbor Edited" },
  });
  if (patched.data.opponent !== "Harbor Edited") {
    throw new Error("PATCH /games/:id should update opponent");
  }

  const again = await json("/calendar/import/commit", {
    method: "POST",
    token: coach.token,
    body: {
      events: [
        {
          uid: jv.uid,
          teamId: jv.suggestedTeamId,
          opponent: "Harbor Edited",
          scheduledAt: jv.scheduledAt,
        },
      ],
    },
  });
  if (again.data.games.length !== 1 || again.data.games[0].id !== imported.id) {
    throw new Error("re-import should upsert by ICS UID instead of duplicating");
  }

  const history = await json(`/seasons/${IDS.activeSeason}/history`, { token: parent.token });
  if (!history.data.games.some((game) => game.opponent.includes("Riverside") || game.opponent.includes("Harbor"))) {
    throw new Error("season history should include imported games");
  }

  console.log("smoke-calendar-import: PASS");
}

main().catch((err) => {
  console.error("smoke-calendar-import: FAIL");
  console.error(err);
  process.exit(1);
});
