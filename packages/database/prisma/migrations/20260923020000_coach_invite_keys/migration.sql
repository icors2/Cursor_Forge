-- One-time coach signup keys. Plaintext is never stored; only keyHash is persisted.

CREATE TABLE "CoachInviteKey" (
    "id" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "label" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usedAt" TIMESTAMP(3),
    "usedById" TEXT,

    CONSTRAINT "CoachInviteKey_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CoachInviteKey_usedAt_idx" ON "CoachInviteKey"("usedAt");

ALTER TABLE "CoachInviteKey" ADD CONSTRAINT "CoachInviteKey_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CoachInviteKey" ADD CONSTRAINT "CoachInviteKey_usedById_fkey" FOREIGN KEY ("usedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
