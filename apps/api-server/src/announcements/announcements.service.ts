/**
 * Announcement board use-cases. List hides expired rows unless includeExpired=true (staff).
 */

import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import type { AnnouncementCommentView, AnnouncementView } from "@volleyball-manager/shared-types";
import { PrismaService } from "../prisma/prisma.service";
import type { RequestUser } from "../auth/auth.types";
import type { CreateAnnouncementDto, CreateCommentDto, UpdateAnnouncementDto } from "./announcements.dto";

/** Prisma include used by every announcement query. */
const AUTHOR = { author: { select: { firstName: true, lastName: true } } } as const;

/** Isolated announcements domain service. */
@Injectable()
export class AnnouncementsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Lists non-expired announcements (newest first). Staff may request expired rows. */
  async list(includeExpired: boolean): Promise<AnnouncementView[]> {
    const rows = await this.prisma.announcement.findMany({
      where: includeExpired
        ? undefined
        : { OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
      include: AUTHOR,
      orderBy: { createdAt: "desc" },
    });
    return rows.map((row) => this.toView(row));
  }

  /** COACH/ADMIN post a new announcement. */
  async create(actor: RequestUser, dto: CreateAnnouncementDto): Promise<AnnouncementView> {
    const created = await this.prisma.announcement.create({
      data: {
        title: dto.title.trim(),
        content: dto.content.trim(),
        authorId: actor.id,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
      },
      include: AUTHOR,
    });
    return this.toView(created);
  }

  /** Author or ADMIN may edit. */
  async update(actor: RequestUser, id: string, dto: UpdateAnnouncementDto): Promise<AnnouncementView> {
    const existing = await this.prisma.announcement.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException("Announcement not found");
    }
    this.assertCanMutate(actor, existing.authorId);
    const updated = await this.prisma.announcement.update({
      where: { id },
      data: {
        ...(dto.title !== undefined ? { title: dto.title.trim() } : {}),
        ...(dto.content !== undefined ? { content: dto.content.trim() } : {}),
        ...(dto.expiresAt !== undefined ? { expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null } : {}),
      },
      include: AUTHOR,
    });
    return this.toView(updated);
  }

  /** Author or ADMIN may delete. */
  async remove(actor: RequestUser, id: string): Promise<{ ok: true }> {
    const existing = await this.prisma.announcement.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException("Announcement not found");
    }
    this.assertCanMutate(actor, existing.authorId);
    await this.prisma.announcement.delete({ where: { id } });
    return { ok: true };
  }

  /** ADMIN can edit any row; coaches only their own. */
  private assertCanMutate(actor: RequestUser, authorId: string): void {
    if (actor.role === "ADMIN" || actor.id === authorId) {
      return;
    }
    throw new ForbiddenException("Cannot change another coach's announcement");
  }

  /** Lists comments for one announcement (oldest first). */
  async listComments(announcementId: string): Promise<AnnouncementCommentView[]> {
    await this.assertAnnouncement(announcementId);
    const rows = await this.prisma.announcementComment.findMany({
      where: { announcementId },
      include: { author: { select: { firstName: true, lastName: true } } },
      orderBy: { createdAt: "asc" },
    });
    return rows.map((row) => this.toComment(row));
  }

  /** Any authenticated user may comment unless muted. */
  async addComment(actor: RequestUser, announcementId: string, dto: CreateCommentDto): Promise<AnnouncementCommentView> {
    await this.assertAnnouncement(announcementId);
    const muted = await this.prisma.commentMute.findUnique({ where: { mutedUserId: actor.id } });
    if (muted) {
      throw new ForbiddenException("You are muted from commenting");
    }
    const created = await this.prisma.announcementComment.create({
      data: {
        announcementId,
        authorId: actor.id,
        content: dto.content.trim(),
      },
      include: { author: { select: { firstName: true, lastName: true } } },
    });
    return this.toComment(created);
  }

  /** Author, COACH, or ADMIN may delete a comment. */
  async removeComment(actor: RequestUser, announcementId: string, commentId: string): Promise<{ ok: true }> {
    const comment = await this.prisma.announcementComment.findFirst({
      where: { id: commentId, announcementId },
    });
    if (!comment) {
      throw new NotFoundException("Comment not found");
    }
    const staff = actor.role === "ADMIN" || actor.role === "COACH";
    if (!staff && actor.id !== comment.authorId) {
      throw new ForbiddenException("Cannot delete another user's comment");
    }
    await this.prisma.announcementComment.delete({ where: { id: commentId } });
    return { ok: true };
  }

  /** COACH/ADMIN mute a commenter club-wide. */
  async mute(actor: RequestUser, userId: string): Promise<{ ok: true }> {
    if (userId === actor.id) {
      throw new ForbiddenException("Cannot mute yourself");
    }
    const target = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!target) {
      throw new NotFoundException("User not found");
    }
    await this.prisma.commentMute.upsert({
      where: { mutedUserId: userId },
      update: { mutedById: actor.id },
      create: { mutedUserId: userId, mutedById: actor.id },
    });
    return { ok: true };
  }

  /** COACH/ADMIN unmute. */
  async unmute(userId: string): Promise<{ ok: true }> {
    await this.prisma.commentMute.deleteMany({ where: { mutedUserId: userId } });
    return { ok: true };
  }

  /** Ensures the announcement exists. */
  private async assertAnnouncement(id: string): Promise<void> {
    const row = await this.prisma.announcement.findUnique({ where: { id } });
    if (!row) {
      throw new NotFoundException("Announcement not found");
    }
  }

  /** Maps a comment row to the public view. */
  private toComment(row: {
    id: string;
    announcementId: string;
    authorId: string;
    content: string;
    createdAt: Date;
    author: { firstName: string; lastName: string };
  }): AnnouncementCommentView {
    return {
      id: row.id,
      announcementId: row.announcementId,
      authorId: row.authorId,
      content: row.content,
      createdAt: row.createdAt.toISOString(),
      authorName: `${row.author.firstName} ${row.author.lastName}`,
    };
  }

  /** Maps a Prisma row + author to the public view. */
  private toView(row: {
    id: string;
    title: string;
    content: string;
    authorId: string;
    createdAt: Date;
    expiresAt: Date | null;
    author: { firstName: string; lastName: string };
  }): AnnouncementView {
    return {
      id: row.id,
      title: row.title,
      content: row.content,
      authorId: row.authorId,
      authorName: `${row.author.firstName} ${row.author.lastName}`,
      createdAt: row.createdAt.toISOString(),
      expiresAt: row.expiresAt ? row.expiresAt.toISOString() : null,
    };
  }
}
