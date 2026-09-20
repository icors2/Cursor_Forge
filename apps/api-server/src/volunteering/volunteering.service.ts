/**
 * Volunteer use-cases. Capacity uses SELECT … FOR UPDATE inside a transaction (HTTP 409 when full).
 */

import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import type { VolunteerRegistrationView, VolunteerSlotView } from "@volleyball-manager/shared-types";
import { ActiveSeasonService } from "../common/active-season.service";
import { PrismaService } from "../prisma/prisma.service";
import type { CreateVolunteerSlotDto } from "./volunteering.dto";

/** Row shape returned by the locking SELECT. */
interface LockedSlotRow {
  /** Slot id. */
  id: string;
  /** Maximum registrations. */
  capacity: number;
  /** Season the slot belongs to. */
  seasonId: string;
}

/** Isolated volunteering domain service. */
@Injectable()
export class VolunteeringService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly seasons: ActiveSeasonService,
  ) {}

  /** Lists slots for the resolved season and marks whether `userId` already signed up. */
  async list(userId: string, historical?: string, seasonId?: string): Promise<VolunteerSlotView[]> {
    const resolved = await this.seasons.resolveSeasonId({
      historical: historical === "true",
      seasonId,
    });
    const slots = await this.prisma.volunteerSlot.findMany({
      where: { seasonId: resolved },
      include: { registrations: true },
      orderBy: { startTime: "asc" },
    });
    return slots.map((slot) => this.toView(slot, userId));
  }

  /** ADMIN creates a slot on the active season. Times must be UTC instants with end after start. */
  async createSlot(dto: CreateVolunteerSlotDto): Promise<VolunteerSlotView> {
    const start = new Date(dto.startTime);
    const end = new Date(dto.endTime);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
      throw new BadRequestException("endTime must be after startTime");
    }
    const season = await this.seasons.getActiveSeason();
    const created = await this.prisma.volunteerSlot.create({
      data: {
        title: dto.title.trim(),
        startTime: start,
        endTime: end,
        capacity: dto.capacity,
        seasonId: season.id,
      },
      include: { registrations: true },
    });
    return this.toView(created, "");
  }

  /**
   * PARENT registers for a slot. Locks the slot row, recounts registrations, then inserts.
   * Full or duplicate → HTTP 409. Does not increment a stored counter.
   */
  async register(slotId: string, userId: string): Promise<VolunteerRegistrationView> {
    const active = await this.seasons.getActiveSeason();

    try {
      return await this.prisma.$transaction(async (tx) => {
        const locked = await tx.$queryRaw<LockedSlotRow[]>`
          SELECT id, capacity, "seasonId"
          FROM "VolunteerSlot"
          WHERE id = ${slotId}
          FOR UPDATE
        `;
        const slot = locked[0];
        if (!slot || slot.seasonId !== active.id) {
          throw new NotFoundException("Volunteer slot not found in the active season");
        }

        const capacity = Number(slot.capacity);
        const taken = await tx.volunteerRegistration.count({ where: { slotId: slot.id } });
        if (taken >= capacity) {
          throw new ConflictException("Volunteer slot is full");
        }

        const created = await tx.volunteerRegistration.create({
          data: { slotId: slot.id, userId },
        });
        return { id: created.id, slotId: created.slotId, userId: created.userId };
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        throw new ConflictException("Already registered for this slot");
      }
      throw err;
    }
  }

  /** Maps a Prisma slot (with registrations) to the public view. */
  private toView(
    slot: {
      id: string;
      title: string;
      startTime: Date;
      endTime: Date;
      capacity: number;
      seasonId: string;
      registrations: { userId: string }[];
    },
    userId: string,
  ): VolunteerSlotView {
    return {
      id: slot.id,
      title: slot.title,
      startTime: slot.startTime.toISOString(),
      endTime: slot.endTime.toISOString(),
      capacity: slot.capacity,
      taken: slot.registrations.length,
      seasonId: slot.seasonId,
      registered: userId ? slot.registrations.some((row) => row.userId === userId) : false,
    };
  }
}
