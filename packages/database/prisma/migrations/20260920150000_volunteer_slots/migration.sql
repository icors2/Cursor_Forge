-- Additive volunteer module: slots + registrations with a unique (user, slot) pair.
-- Capacity is enforced in the API with SELECT … FOR UPDATE, not a stored counter.

CREATE TABLE "VolunteerSlot" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "capacity" INTEGER NOT NULL,
    "seasonId" TEXT NOT NULL,

    CONSTRAINT "VolunteerSlot_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "VolunteerSlot_seasonId_idx" ON "VolunteerSlot"("seasonId");

CREATE TABLE "VolunteerRegistration" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "slotId" TEXT NOT NULL,

    CONSTRAINT "VolunteerRegistration_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "VolunteerRegistration_userId_slotId_key" ON "VolunteerRegistration"("userId", "slotId");
CREATE INDEX "VolunteerRegistration_slotId_idx" ON "VolunteerRegistration"("slotId");

ALTER TABLE "VolunteerSlot" ADD CONSTRAINT "VolunteerSlot_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "VolunteerRegistration" ADD CONSTRAINT "VolunteerRegistration_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "VolunteerRegistration" ADD CONSTRAINT "VolunteerRegistration_slotId_fkey" FOREIGN KEY ("slotId") REFERENCES "VolunteerSlot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
