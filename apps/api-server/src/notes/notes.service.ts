/**
 * Coach notes use-cases. PLAYER/PARENT never read these rows.
 */

import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import type { CoachNoteView } from "@volleyball-manager/shared-types";
import { PrismaService } from "../prisma/prisma.service";
import type { RequestUser } from "../auth/auth.types";
import type { CreateCoachNoteDto, UpdateCoachNoteDto } from "./notes.dto";

/** Prisma include for author + player names. */
const NOTE_INCLUDE = {
  player: { select: { firstName: true, lastName: true } },
  coach: { select: { firstName: true, lastName: true } },
} as const;

/** Isolated coach-notes domain service. */
@Injectable()
export class NotesService {
  constructor(private readonly prisma: PrismaService) {}

  /** Lists notes, optionally filtered to one player. */
  async list(playerId?: string): Promise<CoachNoteView[]> {
    const rows = await this.prisma.coachNote.findMany({
      where: playerId ? { playerId } : undefined,
      include: NOTE_INCLUDE,
      orderBy: { createdAt: "desc" },
    });
    return rows.map((row) => this.toView(row));
  }

  /** Creates a note on a PLAYER account (must exist). */
  async create(actor: RequestUser, dto: CreateCoachNoteDto): Promise<CoachNoteView> {
    const player = await this.prisma.user.findUnique({ where: { id: dto.playerId } });
    if (!player || player.role !== "PLAYER") {
      throw new BadRequestException("Notes can only target a PLAYER");
    }
    const created = await this.prisma.coachNote.create({
      data: {
        playerId: player.id,
        coachId: actor.id,
        content: dto.content.trim(),
      },
      include: NOTE_INCLUDE,
    });
    return this.toView(created);
  }

  /** Author or ADMIN may replace the body. */
  async update(actor: RequestUser, id: string, dto: UpdateCoachNoteDto): Promise<CoachNoteView> {
    const existing = await this.prisma.coachNote.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException("Note not found");
    }
    this.assertCanMutate(actor, existing.coachId);
    const updated = await this.prisma.coachNote.update({
      where: { id },
      data: { content: dto.content.trim() },
      include: NOTE_INCLUDE,
    });
    return this.toView(updated);
  }

  /** Author or ADMIN may delete. */
  async remove(actor: RequestUser, id: string): Promise<{ ok: true }> {
    const existing = await this.prisma.coachNote.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException("Note not found");
    }
    this.assertCanMutate(actor, existing.coachId);
    await this.prisma.coachNote.delete({ where: { id } });
    return { ok: true };
  }

  /** ADMIN can edit any note; coaches only their own. */
  private assertCanMutate(actor: RequestUser, coachId: string): void {
    if (actor.role === "ADMIN" || actor.id === coachId) {
      return;
    }
    throw new ForbiddenException("Cannot change another coach's note");
  }

  /** Maps a Prisma note to the public view. */
  private toView(row: {
    id: string;
    playerId: string;
    coachId: string;
    content: string;
    createdAt: Date;
    player: { firstName: string; lastName: string };
    coach: { firstName: string; lastName: string };
  }): CoachNoteView {
    return {
      id: row.id,
      playerId: row.playerId,
      playerName: `${row.player.firstName} ${row.player.lastName}`,
      coachId: row.coachId,
      coachName: `${row.coach.firstName} ${row.coach.lastName}`,
      content: row.content,
      createdAt: row.createdAt.toISOString(),
    };
  }
}
