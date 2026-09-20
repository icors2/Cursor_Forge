/**
 * Idempotent local seed for the full club demo (stats, volunteer, calendar, notes, announcements, dues).
 * Demo passwords are intentional and documented — never use them in production.
 */

import { PrismaClient, Role, StatType } from "@prisma/client";
import bcrypt from "bcryptjs";

/** Shared Prisma client for this one-shot script. */
const prisma = new PrismaClient();

/** Fixed ids so docs and smoke scripts can address the demo game. */
const IDS = {
  admin: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
  coach: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
  parent: "cccccccc-cccc-cccc-cccc-cccccccccccc",
  parent2: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
  parentUnpaid: "10101010-1010-4101-8101-101010101010",
  player: "dddddddd-dddd-dddd-dddd-dddddddddddd",
  player2: "f1f1f1f1-f1f1-41f1-81f1-f1f1f1f1f1f1",
  playerUnpaid: "20202020-2020-4202-8202-202020202020",
  archivedSeason: "11111111-1111-4111-8111-111111111111",
  activeSeason: "22222222-2222-4222-8222-222222222222",
  archivedTeam: "33333333-3333-4333-8333-333333333333",
  activeTeam: "44444444-4444-4444-8444-444444444444",
  archivedGame: "55555555-5555-4555-8555-555555555555",
  activeGame: "66666666-6666-4666-8666-666666666666",
  activeGame2: "61616161-6161-4616-8616-616161616161",
  roster: "77777777-7777-4777-8777-777777777777",
  roster2: "78787878-7878-4787-8787-787878787878",
  concessions: "88888888-8888-4888-8888-888888888888",
  lineJudge: "99999999-9999-4999-8999-999999999999",
  archivedConcessions: "aaaaaaa1-aaaa-4aaa-8aaa-aaaaaaaaaaa1",
  announcement: "b1b1b1b1-b1b1-41b1-81b1-b1b1b1b1b1b1",
  note: "c1c1c1c1-c1c1-41c1-81c1-c1c1c1c1c1c1",
} as const;

/** Demo password for every seeded account (local/dev only). */
const DEMO_PASSWORD = "Demo1234!";

/**
 * Upserts users, seasons, teams, games, roster, volunteer slots, notes, and announcements.
 * Re-running seed restores Fall 2026 as the only active season (archive smoke relies on this).
 */
async function seed(): Promise<void> {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  await prisma.user.upsert({
    where: { email: "admin@demo.local" },
    update: { passwordHash, role: Role.ADMIN, firstName: "Casey", lastName: "Admin" },
    create: {
      id: IDS.admin,
      email: "admin@demo.local",
      passwordHash,
      role: Role.ADMIN,
      firstName: "Casey",
      lastName: "Admin",
      isDuesPaid: true,
    },
  });

  await prisma.user.upsert({
    where: { email: "coach@demo.local" },
    update: { passwordHash, role: Role.COACH, firstName: "Jordan", lastName: "Blake" },
    create: {
      id: IDS.coach,
      email: "coach@demo.local",
      passwordHash,
      role: Role.COACH,
      firstName: "Jordan",
      lastName: "Blake",
      isDuesPaid: true,
    },
  });

  await prisma.user.upsert({
    where: { email: "parent@demo.local" },
    update: { passwordHash, role: Role.PARENT, firstName: "Sam", lastName: "Rivera" },
    create: {
      id: IDS.parent,
      email: "parent@demo.local",
      passwordHash,
      role: Role.PARENT,
      firstName: "Sam",
      lastName: "Rivera",
      isDuesPaid: true,
    },
  });

  await prisma.user.upsert({
    where: { email: "parent2@demo.local" },
    update: { passwordHash, role: Role.PARENT, firstName: "Riley", lastName: "Chen" },
    create: {
      id: IDS.parent2,
      email: "parent2@demo.local",
      passwordHash,
      role: Role.PARENT,
      firstName: "Riley",
      lastName: "Chen",
      isDuesPaid: true,
    },
  });

  await prisma.user.upsert({
    where: { email: "player@demo.local" },
    update: { passwordHash, role: Role.PLAYER, firstName: "Alex", lastName: "Rivera", isDuesPaid: true },
    create: {
      id: IDS.player,
      email: "player@demo.local",
      passwordHash,
      role: Role.PLAYER,
      firstName: "Alex",
      lastName: "Rivera",
      isDuesPaid: true,
    },
  });

  await prisma.user.upsert({
    where: { email: "player2@demo.local" },
    update: { passwordHash, role: Role.PLAYER, firstName: "Morgan", lastName: "Lee", isDuesPaid: true },
    create: {
      id: IDS.player2,
      email: "player2@demo.local",
      passwordHash,
      role: Role.PLAYER,
      firstName: "Morgan",
      lastName: "Lee",
      isDuesPaid: true,
    },
  });

  await prisma.user.upsert({
    where: { email: "parent-unpaid@demo.local" },
    update: { passwordHash, role: Role.PARENT, firstName: "Jamie", lastName: "Cole", isDuesPaid: false },
    create: {
      id: IDS.parentUnpaid,
      email: "parent-unpaid@demo.local",
      passwordHash,
      role: Role.PARENT,
      firstName: "Jamie",
      lastName: "Cole",
      isDuesPaid: false,
    },
  });

  await prisma.user.upsert({
    where: { email: "player-unpaid@demo.local" },
    update: { passwordHash, role: Role.PLAYER, firstName: "Taylor", lastName: "Ng", isDuesPaid: false },
    create: {
      id: IDS.playerUnpaid,
      email: "player-unpaid@demo.local",
      passwordHash,
      role: Role.PLAYER,
      firstName: "Taylor",
      lastName: "Ng",
      isDuesPaid: false,
    },
  });

  // archiveSeason smoke creates extra seasons; collapse back to a single active row.
  await prisma.season.updateMany({ data: { isActive: false } });

  await prisma.season.upsert({
    where: { id: IDS.archivedSeason },
    update: { year: 2025, name: "Fall 2025", isActive: false },
    create: { id: IDS.archivedSeason, year: 2025, name: "Fall 2025", isActive: false },
  });

  await prisma.season.upsert({
    where: { id: IDS.activeSeason },
    update: { year: 2026, name: "Fall 2026", isActive: true },
    create: { id: IDS.activeSeason, year: 2026, name: "Fall 2026", isActive: true },
  });

  await prisma.team.upsert({
    where: { id: IDS.archivedTeam },
    update: { name: "Legacy Spikers", seasonId: IDS.archivedSeason },
    create: { id: IDS.archivedTeam, name: "Legacy Spikers", seasonId: IDS.archivedSeason },
  });

  await prisma.team.upsert({
    where: { id: IDS.activeTeam },
    update: { name: "Forge United", seasonId: IDS.activeSeason },
    create: { id: IDS.activeTeam, name: "Forge United", seasonId: IDS.activeSeason },
  });

  await prisma.game.upsert({
    where: { id: IDS.archivedGame },
    update: {
      teamId: IDS.archivedTeam,
      opponent: "Old Rivals",
      scheduledAt: new Date("2025-11-02T18:00:00.000Z"),
      seasonId: IDS.archivedSeason,
    },
    create: {
      id: IDS.archivedGame,
      teamId: IDS.archivedTeam,
      opponent: "Old Rivals",
      scheduledAt: new Date("2025-11-02T18:00:00.000Z"),
      seasonId: IDS.archivedSeason,
    },
  });

  await prisma.game.upsert({
    where: { id: IDS.activeGame },
    update: {
      teamId: IDS.activeTeam,
      opponent: "Riverside",
      scheduledAt: new Date("2026-09-20T17:00:00.000Z"),
      seasonId: IDS.activeSeason,
    },
    create: {
      id: IDS.activeGame,
      teamId: IDS.activeTeam,
      opponent: "Riverside",
      scheduledAt: new Date("2026-09-20T17:00:00.000Z"),
      seasonId: IDS.activeSeason,
    },
  });

  await prisma.game.upsert({
    where: { id: IDS.activeGame2 },
    update: {
      teamId: IDS.activeTeam,
      opponent: "Harbor",
      scheduledAt: new Date("2026-09-27T18:00:00.000Z"),
      seasonId: IDS.activeSeason,
    },
    create: {
      id: IDS.activeGame2,
      teamId: IDS.activeTeam,
      opponent: "Harbor",
      scheduledAt: new Date("2026-09-27T18:00:00.000Z"),
      seasonId: IDS.activeSeason,
    },
  });

  await prisma.roster.upsert({
    where: { id: IDS.roster },
    update: { userId: IDS.player, teamId: IDS.activeTeam, jerseyNum: 7 },
    create: {
      id: IDS.roster,
      userId: IDS.player,
      teamId: IDS.activeTeam,
      jerseyNum: 7,
    },
  });

  await prisma.roster.upsert({
    where: { id: IDS.roster2 },
    update: { userId: IDS.player2, teamId: IDS.activeTeam, jerseyNum: 12 },
    create: {
      id: IDS.roster2,
      userId: IDS.player2,
      teamId: IDS.activeTeam,
      jerseyNum: 12,
    },
  });

  await prisma.volunteerSlot.upsert({
    where: { id: IDS.concessions },
    update: {
      title: "Concessions",
      startTime: new Date("2026-09-20T16:00:00.000Z"),
      endTime: new Date("2026-09-20T19:00:00.000Z"),
      capacity: 1,
      seasonId: IDS.activeSeason,
    },
    create: {
      id: IDS.concessions,
      title: "Concessions",
      startTime: new Date("2026-09-20T16:00:00.000Z"),
      endTime: new Date("2026-09-20T19:00:00.000Z"),
      capacity: 1,
      seasonId: IDS.activeSeason,
    },
  });

  await prisma.volunteerSlot.upsert({
    where: { id: IDS.lineJudge },
    update: {
      title: "Line Judge",
      startTime: new Date("2026-09-20T16:30:00.000Z"),
      endTime: new Date("2026-09-20T18:30:00.000Z"),
      capacity: 3,
      seasonId: IDS.activeSeason,
    },
    create: {
      id: IDS.lineJudge,
      title: "Line Judge",
      startTime: new Date("2026-09-20T16:30:00.000Z"),
      endTime: new Date("2026-09-20T18:30:00.000Z"),
      capacity: 3,
      seasonId: IDS.activeSeason,
    },
  });

  await prisma.volunteerSlot.upsert({
    where: { id: IDS.archivedConcessions },
    update: {
      title: "Legacy Concessions",
      startTime: new Date("2025-11-02T16:00:00.000Z"),
      endTime: new Date("2025-11-02T19:00:00.000Z"),
      capacity: 2,
      seasonId: IDS.archivedSeason,
    },
    create: {
      id: IDS.archivedConcessions,
      title: "Legacy Concessions",
      startTime: new Date("2025-11-02T16:00:00.000Z"),
      endTime: new Date("2025-11-02T19:00:00.000Z"),
      capacity: 2,
      seasonId: IDS.archivedSeason,
    },
  });

  await prisma.announcement.upsert({
    where: { id: IDS.announcement },
    update: {
      title: "Practice moved to 6pm",
      content: "Wednesday practice is 18:00 UTC at the main gym. Bring both jerseys.",
      authorId: IDS.coach,
      expiresAt: new Date("2026-12-31T23:59:59.000Z"),
    },
    create: {
      id: IDS.announcement,
      title: "Practice moved to 6pm",
      content: "Wednesday practice is 18:00 UTC at the main gym. Bring both jerseys.",
      authorId: IDS.coach,
      expiresAt: new Date("2026-12-31T23:59:59.000Z"),
    },
  });

  await prisma.coachNote.upsert({
    where: { id: IDS.note },
    update: {
      playerId: IDS.player,
      coachId: IDS.coach,
      content: "Work the outside slide — timing is early on the second tempo.",
    },
    create: {
      id: IDS.note,
      playerId: IDS.player,
      coachId: IDS.coach,
      content: "Work the outside slide — timing is early on the second tempo.",
    },
  });

  const existingDemoStat = await prisma.stat.findFirst({
    where: { gameId: IDS.activeGame, type: StatType.ACE },
  });
  if (!existingDemoStat) {
    await prisma.stat.create({
      data: {
        gameId: IDS.activeGame,
        rosterId: IDS.roster,
        type: StatType.ACE,
        timestamp: new Date("2026-09-20T17:05:00.000Z"),
      },
    });
  }

  // eslint-disable-next-line no-console -- seed is a CLI
  console.log("Seeded Volleyball Manager demo data.");
  console.log("  admin@demo.local / Demo1234!  (ADMIN)");
  console.log("  coach@demo.local / Demo1234!  (COACH)");
  console.log("  parent@demo.local / Demo1234! (PARENT)");
  console.log("  parent2@demo.local / Demo1234! (PARENT)");
  console.log("  parent-unpaid@demo.local / Demo1234! (PARENT, dues unpaid)");
  console.log("  player@demo.local / Demo1234! (PLAYER)");
  console.log("  player2@demo.local / Demo1234! (PLAYER)");
  console.log("  player-unpaid@demo.local / Demo1234! (PLAYER, dues unpaid)");
  console.log(`  active game id: ${IDS.activeGame}`);
  console.log(`  team id: ${IDS.activeTeam}`);
  console.log(`  concessions slot (cap 1): ${IDS.concessions}`);
}

seed()
  .catch((err: unknown) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
