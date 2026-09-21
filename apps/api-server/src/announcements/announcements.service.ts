/**
 * Announcement board use-cases. List hides expired rows unless includeExpired=true (staff).
 */

import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import type { AnnouncementView } from "@volleyball-manager/shared-types";
import { PrismaService } from "../prisma/prisma.service";
import type { RequestUser } from "../auth/auth.types";
import type { CreateAnnouncementDto, UpdateAnnouncementDto } from "./announcements.dto";

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
