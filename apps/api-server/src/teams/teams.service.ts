/**
 * Team + roster use-cases. List defaults to the active season.
 * Roster add does not require dues — those are due before the season starts.
 */

import { randomBytes } from "node:crypto";
import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import type { CreateRosterResult, RosterPlayer, RosterPosition, TeamView } from "@volleyball-manager/shared-types";
import bcrypt from "bcryptjs";
import { ActiveSeasonService } from "../common/active-season.service";
import { PrismaService } from "../prisma/prisma.service";
import type { CreateRosterDto, CreateTeamDto } from "./teams.dto";

/** Isolated teams domain service. */
@Injectable()
export class TeamsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly seasons: ActiveSeasonService,
  ) {}

  /** Lists teams for the resolved season (active by default). */
  async list(historical?: string, seasonId?: string): Promise<TeamView[]> {
    const resolved = await this.seasons.resolveSeasonId({
      historical: historical === "true",
      seasonId,
    });
    const teams = await this.prisma.team.findMany({
      where: { seasonId: resolved },
      include: { season: true, _count: { select: { roster: true } } },
      orderBy: { name: "asc" },
    });
    return teams.map((team) => this.toView(team));
  }

  /** Loads one team if it belongs to the resolved season. */
  async getById(id: string, historical?: string, seasonId?: string): Promise<TeamView & { roster: RosterPlayer[] }> {
    const resolved = await this.seasons.resolveSeasonId({
      historical: historical === "true",
      seasonId,
    });
    const team = await this.prisma.team.findFirst({
      where: { id, seasonId: resolved },
      include: {
        season: true,
        _count: { select: { roster: true } },
        roster: { include: { user: true }, orderBy: { jerseyNum: "asc" } },
      },
    });
    if (!team) {
      throw new NotFoundException("Team not found");
    }
    return {
      ...this.toView(team),
      roster: team.roster.map((row) => ({
        id: row.id,
        jerseyNum: row.jerseyNum,
        firstName: row.user.firstName,
        lastName: row.user.lastName,
        userId: row.userId,
        position: row.position,
      })),
    };
  }

  /** Creates a team on the active season. */
  async create(dto: CreateTeamDto): Promise<TeamView> {
    const season = await this.seasons.getActiveSeason();
    const created = await this.prisma.team.create({
      data: { name: dto.name.trim(), seasonId: season.id },
      include: { season: true, _count: { select: { roster: true } } },
    });
    return this.toView(created);
  }

  /**
   * Adds a PLAYER to an active-season team.
   * Dues are not required here — coaches build the roster before the season starts.
   */
  async addRoster(teamId: string, dto: CreateRosterDto): Promise<CreateRosterResult> {
    const season = await this.seasons.getActiveSeason();
    const team = await this.prisma.team.findFirst({ where: { id: teamId, seasonId: season.id } });
    if (!team) {
      throw new NotFoundException("Team not found in the active season");
    }
    let userId = dto.userId;
    let temporaryPassword: string | undefined;
    if (!userId) {
      const email = dto.email?.toLowerCase().trim();
      const firstName = dto.firstName?.trim();
      const lastName = dto.lastName?.trim();
      if (!email || !firstName || !lastName) {
        throw new BadRequestException("Provide a player from the list or first name, last name, and email");
      }
      const existing = await this.prisma.user.findUnique({ where: { email } });
      if (existing) {
        if (existing.role !== "PLAYER") {
          throw new BadRequestException("That email is already a non-player account");
        }
        userId = existing.id;
      } else {
        temporaryPassword = randomBytes(6).toString("base64url");
        const createdUser = await this.prisma.user.create({
          data: {
            email,
            passwordHash: await bcrypt.hash(temporaryPassword, 10),
            firstName,
            lastName,
            role: "PLAYER",
            isDuesPaid: false,
          },
        });
        userId = createdUser.id;
      }
    }
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.role !== "PLAYER") {
      throw new BadRequestException("Roster entries must be PLAYER accounts");
    }
    const already = await this.prisma.roster.findUnique({
      where: { userId_teamId: { userId: user.id, teamId: team.id } },
    });
    if (already) {
      throw new ConflictException("Player is already on this roster");
    }
    const created = await this.prisma.roster.create({
      data: {
        teamId: team.id,
        userId: user.id,
        jerseyNum: dto.jerseyNum ?? null,
        position: dto.position ?? null,
      },
      include: { user: true },
    });
    return {
      id: created.id,
      jerseyNum: created.jerseyNum,
      firstName: created.user.firstName,
      lastName: created.user.lastName,
      userId: created.userId,
      position: created.position,
      ...(temporaryPassword ? { temporaryPassword } : {}),
    };
  }

  /** COACH/ADMIN set jersey and/or court position on an active-season roster row. */
  async updateRoster(
    teamId: string,
    rosterId: string,
    dto: { jerseyNum?: number | null; position?: RosterPosition | null },
  ): Promise<RosterPlayer> {
    const season = await this.seasons.getActiveSeason();
    const row = await this.prisma.roster.findFirst({
      where: { id: rosterId, teamId, team: { seasonId: season.id } },
      include: { user: true },
    });
    if (!row) {
      throw new NotFoundException("Roster row not found in the active season");
    }
    const updated = await this.prisma.roster.update({
      where: { id: row.id },
      data: {
        ...(dto.jerseyNum !== undefined ? { jerseyNum: dto.jerseyNum } : {}),
        ...(dto.position !== undefined ? { position: dto.position } : {}),
      },
      include: { user: true },
    });
    return {
      id: updated.id,
      jerseyNum: updated.jerseyNum,
      firstName: updated.user.firstName,
      lastName: updated.user.lastName,
      userId: updated.userId,
      position: updated.position,
    };
  }

  /** Maps a team + season to the public view. */
  private toView(team: {
    id: string;
    name: string;
    seasonId: string;
    season: { name: string; isActive: boolean };
    _count: { roster: number };
  }): TeamView {
    return {
      id: team.id,
      name: team.name,
      seasonId: team.seasonId,
      seasonName: team.season.name,
      seasonActive: team.season.isActive,
      rosterCount: team._count.roster,
    };
  }
}
