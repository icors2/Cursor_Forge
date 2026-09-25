#!/usr/bin/env node
/**
 * Smoke news comments: parent posts, coach deletes, mute blocks further comments.
 */

import { expectStatus, IDS, json, login } from "./smoke-helpers.mjs";

/** Critical-path comment thread + mute. */
async function main() {
  const coach = await login("coach@demo.local");
  const parent = await login("parent@demo.local");
  const player = await login("player@demo.local");

  const created = await json(`/announcements/${IDS.announcement}/comments`, {
    method: "POST",
    token: parent.token,
    body: { content: "We can bring extra water." },
  });
  if (!created.data.id || created.data.authorId !== parent.user.id) {
    throw new Error("parent should be able to comment");
  }

  const listed = await json(`/announcements/${IDS.announcement}/comments`, { token: player.token });
  if (!listed.data.some((row) => row.id === created.data.id)) {
    throw new Error("player should see the parent comment");
  }

  await json(`/announcements/${IDS.announcement}/comments`, {
    method: "POST",
    token: player.token,
    body: { content: "I will be there." },
  });

  await json(`/announcements/${IDS.announcement}/comments/${created.data.id}`, {
    method: "DELETE",
    token: coach.token,
  });

  await json("/announcements/mutes", {
    method: "POST",
    token: coach.token,
    body: { userId: parent.user.id },
  });
  await expectStatus(403, () =>
    json(`/announcements/${IDS.announcement}/comments`, {
      method: "POST",
      token: parent.token,
      body: { content: "Should be blocked." },
    }),
  );

  await json(`/announcements/mutes/${parent.user.id}`, { method: "DELETE", token: coach.token });
  const after = await json(`/announcements/${IDS.announcement}/comments`, {
    method: "POST",
    token: parent.token,
    body: { content: "Back after unmute." },
  });
  await json(`/announcements/${IDS.announcement}/comments/${after.data.id}`, {
    method: "DELETE",
    token: parent.token,
  });

  console.log("smoke-comments: PASS");
}

main().catch((err) => {
  console.error("smoke-comments: FAIL");
  console.error(err);
  process.exit(1);
});
