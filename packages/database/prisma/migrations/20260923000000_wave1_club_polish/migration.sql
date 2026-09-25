-- Wave 1: ICS import identity, remembered feed URL, news comments, comment mutes.

ALTER TABLE "Game" ADD COLUMN "externalUid" TEXT;
CREATE UNIQUE INDEX "Game_externalUid_key" ON "Game"("externalUid");

CREATE TABLE "CalendarSubscription" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CalendarSubscription_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "CalendarSubscription" ADD CONSTRAINT "CalendarSubscription_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "AnnouncementComment" (
    "id" TEXT NOT NULL,
    "announcementId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnnouncementComment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AnnouncementComment_announcementId_idx" ON "AnnouncementComment"("announcementId");
CREATE INDEX "AnnouncementComment_authorId_idx" ON "AnnouncementComment"("authorId");

ALTER TABLE "AnnouncementComment" ADD CONSTRAINT "AnnouncementComment_announcementId_fkey" FOREIGN KEY ("announcementId") REFERENCES "Announcement"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AnnouncementComment" ADD CONSTRAINT "AnnouncementComment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "CommentMute" (
    "id" TEXT NOT NULL,
    "mutedUserId" TEXT NOT NULL,
    "mutedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommentMute_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CommentMute_mutedUserId_key" ON "CommentMute"("mutedUserId");

ALTER TABLE "CommentMute" ADD CONSTRAINT "CommentMute_mutedUserId_fkey" FOREIGN KEY ("mutedUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CommentMute" ADD CONSTRAINT "CommentMute_mutedById_fkey" FOREIGN KEY ("mutedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
