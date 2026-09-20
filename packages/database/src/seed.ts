/**
 * Idempotent local seed for the live-stat first slice.
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
  player: "dddddddd-dddd-dddd-dddd-dddddddddddd",
  archivedSeason: "11111111-1111-4111-8111-111111111111",
  activeSeason: "22222222-2222-4222-8222-222222222222",
  archivedTeam: "33333333-3333-4333-8333-333333333333",
  activeTeam: "44444444-4444-4444-8444-444444444444",
  archivedGame: "55555555-5555-4555-8555-555555555555",
  activeGame: "66666666-6666-4666-8666-666666666666",
  roster: "77777777-7777-4777-8777-777777777777",
} as const;

/** Demo password for every seeded account (local/dev only). */
const DEMO_PASSWORD = "Demo1234!";

/**
 * Upserts users, two seasons (one archived), teams, games, and one roster row.
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
    where: { email: "player@demo.local" },
    update: { passwordHash, role: Role.PLAYER, firstName: "Alex", lastName: "Rivera" },
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
  console.log("  player@demo.local / Demo1234! (PLAYER)");
  console.log(`  active game id: ${IDS.activeGame}`);
}

seed()
  .catch((err: unknown) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
