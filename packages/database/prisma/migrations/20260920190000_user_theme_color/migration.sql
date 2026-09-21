-- Additive per-account accent color. Default matches the existing court-400 brand green.

ALTER TABLE "User" ADD COLUMN "themeColor" TEXT NOT NULL DEFAULT '#3dcf8e';
