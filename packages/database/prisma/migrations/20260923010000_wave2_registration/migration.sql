-- Wave 2: roster positions, team registration windows, and player-pool applications.

CREATE TYPE "RosterPosition" AS ENUM ('OH', 'MB', 'S', 'L', 'OPP', 'DS');
CREATE TYPE "ApplicationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED');

ALTER TABLE "Roster" ADD COLUMN "position" "RosterPosition";

CREATE TABLE "TeamRegistration" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "isOpen" BOOLEAN NOT NULL DEFAULT true,
    "openedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TeamRegistration_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TeamRegistration_teamId_key" ON "TeamRegistration"("teamId");
CREATE INDEX "TeamRegistration_seasonId_idx" ON "TeamRegistration"("seasonId");

ALTER TABLE "TeamRegistration" ADD CONSTRAINT "TeamRegistration_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TeamRegistration" ADD CONSTRAINT "TeamRegistration_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TeamRegistration" ADD CONSTRAINT "TeamRegistration_openedById_fkey" FOREIGN KEY ("openedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "TeamApplication" (
    "id" TEXT NOT NULL,
    "registrationId" TEXT NOT NULL,
    "applicantId" TEXT NOT NULL,
    "playerFirstName" TEXT NOT NULL,
    "playerLastName" TEXT NOT NULL,
    "playerEmail" TEXT NOT NULL,
    "playerUserId" TEXT,
    "preferredPosition" "RosterPosition",
    "note" TEXT,
    "status" "ApplicationStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TeamApplication_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TeamApplication_registrationId_applicantId_key" ON "TeamApplication"("registrationId", "applicantId");
CREATE INDEX "TeamApplication_registrationId_idx" ON "TeamApplication"("registrationId");
CREATE INDEX "TeamApplication_applicantId_idx" ON "TeamApplication"("applicantId");

ALTER TABLE "TeamApplication" ADD CONSTRAINT "TeamApplication_registrationId_fkey" FOREIGN KEY ("registrationId") REFERENCES "TeamRegistration"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TeamApplication" ADD CONSTRAINT "TeamApplication_applicantId_fkey" FOREIGN KEY ("applicantId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TeamApplication" ADD CONSTRAINT "TeamApplication_playerUserId_fkey" FOREIGN KEY ("playerUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
