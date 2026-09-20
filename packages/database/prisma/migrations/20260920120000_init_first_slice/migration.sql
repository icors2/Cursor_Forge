-- First-slice schema: users, seasons, teams, roster, games, event-sourced stats.

CREATE TYPE "Role" AS ENUM ('ADMIN', 'COACH', 'PLAYER', 'PARENT');

CREATE TYPE "StatType" AS ENUM ('KILL', 'ACE', 'BLOCK', 'DIG', 'ERROR');

CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'PLAYER',
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "isDuesPaid" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

CREATE TABLE "Season" (
    "id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Season_pkey" PRIMARY KEY ("id")
);

-- At most one active season at a time (archive will flip this row, then insert another).
CREATE UNIQUE INDEX "Season_one_active" ON "Season" ("isActive") WHERE "isActive" = true;

CREATE TABLE "Team" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,

    CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Team_seasonId_idx" ON "Team"("seasonId");

CREATE TABLE "Roster" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "jerseyNum" INTEGER,

    CONSTRAINT "Roster_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Roster_userId_teamId_key" ON "Roster"("userId", "teamId");

CREATE TABLE "Game" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "opponent" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "seasonId" TEXT NOT NULL,

    CONSTRAINT "Game_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Game_seasonId_idx" ON "Game"("seasonId");
CREATE INDEX "Game_teamId_idx" ON "Game"("teamId");

CREATE TABLE "Stat" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "rosterId" TEXT NOT NULL,
    "type" "StatType" NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Stat_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Stat_gameId_idx" ON "Stat"("gameId");
CREATE INDEX "Stat_rosterId_idx" ON "Stat"("rosterId");

ALTER TABLE "Team" ADD CONSTRAINT "Team_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Roster" ADD CONSTRAINT "Roster_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Roster" ADD CONSTRAINT "Roster_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Game" ADD CONSTRAINT "Game_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Game" ADD CONSTRAINT "Game_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Stat" ADD CONSTRAINT "Stat_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Stat" ADD CONSTRAINT "Stat_rosterId_fkey" FOREIGN KEY ("rosterId") REFERENCES "Roster"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
