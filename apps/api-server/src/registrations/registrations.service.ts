/**
 * Team registration windows and the player pool.
 * Lists default to the active season. Promote uses TeamsService.addRoster.
 */

import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type {
  CreateRosterResult,
  TeamApplicationView,
  TeamRegistrationView,
} from "@volleyball-manager/shared-types";
import { ActiveSeasonService } from "../common/active-season.service";
import { PrismaService } from "../prisma/prisma.service";
import { TeamsService } from "../teams/teams.service";
import type { AcceptApplicationDto, CreateApplicationDto, OpenRegistrationDto, UpdateRegistrationDto } from "./registrations.dto";

/** Isolated registration / player-pool use-cases. */
@Injectable()
export class RegistrationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly seasons: ActiveSeasonService,
    private readonly teams: TeamsService,
  ) {}

  /** Lists active-season windows. Applicants only see open ones unless staff. */
  async list(actor: { id: string; role: string }, openOnly?: boolean): Promise<TeamRegistrationView[]> {
    const season = await this.seasons.getActiveSeason();
    const staff = actor.role === "ADMIN" || actor.role === "COACH";
    const rows = await this.prisma.teamRegistration.findMany({
      where: {
        seasonId: season.id,
        ...(openOnly || !staff ? { isOpen: true } : {}),
      },
      include: { team: true, season: true, _count: { select: { applications: true } } },
      orderBy: { createdAt: "desc" },
    });
    return rows.map((row) => this.toRegistrationView(row, staff));
  }

  /** One window. Staff see the pool; applicants see only their own application. */
  async getById(
    id: string,
    actor: { id: string; role: string },
  ): Promise<TeamRegistrationView & { applications: TeamApplicationView[] }> {
    const season = await this.seasons.getActiveSeason();
    const row = await this.prisma.teamRegistration.findFirst({
      where: { id, seasonId: season.id },
      include: {
        team: true,
        season: true,
        _count: { select: { applications: true } },
        applications: { include: { applicant: true }, orderBy: { createdAt: "asc" } },
      },
    });
    if (!row) {
      throw new NotFoundException("Registration not found");
    }
    const staff = actor.role === "ADMIN" || actor.role === "COACH";
    const applications = staff
      ? row.applications.map((app) => this.toApplicationView(app))
      : row.applications.filter((app) => app.applicantId === actor.id).map((app) => this.toApplicationView(app));
    return { ...this.toRegistrationView(row, staff), applications };
  }

  /** Opens a new window or reopens the existing one for an active-season team. */
  async open(actor: { id: string }, dto: OpenRegistrationDto): Promise<TeamRegistrationView> {
    const season = await this.seasons.getActiveSeason();
    const team = await this.prisma.team.findFirst({ where: { id: dto.teamId, seasonId: season.id } });
    if (!team) {
      throw new NotFoundException("Team not found in the active season");
    }
    const existing = await this.prisma.teamRegistration.findUnique({
      where: { teamId: team.id },
      include: { team: true, season: true, _count: { select: { applications: true } } },
    });
    if (existing) {
      const updated = await this.prisma.teamRegistration.update({
        where: { id: existing.id },
        data: { isOpen: true, openedById: actor.id },
        include: { team: true, season: true, _count: { select: { applications: true } } },
      });
      return this.toRegistrationView(updated, true);
    }
    const created = await this.prisma.teamRegistration.create({
      data: { teamId: team.id, seasonId: season.id, openedById: actor.id, isOpen: true },
      include: { team: true, season: true, _count: { select: { applications: true } } },
    });
    return this.toRegistrationView(created, true);
  }

  /** Closes or reopens an existing window. */
  async update(id: string, dto: UpdateRegistrationDto): Promise<TeamRegistrationView> {
    const season = await this.seasons.getActiveSeason();
    const existing = await this.prisma.teamRegistration.findFirst({
      where: { id, seasonId: season.id },
    });
    if (!existing) {
      throw new NotFoundException("Registration not found");
    }
    const updated = await this.prisma.teamRegistration.update({
      where: { id },
      data: { isOpen: dto.isOpen },
      include: { team: true, season: true, _count: { select: { applications: true } } },
    });
    return this.toRegistrationView(updated, true);
  }

  /** PARENT/PLAYER apply to an open window. One application per account per team. */
  async apply(
    id: string,
    actor: { id: string; role: string; email: string },
    dto: CreateApplicationDto,
  ): Promise<TeamApplicationView> {
    if (actor.role !== "PARENT" && actor.role !== "PLAYER") {
      throw new ForbiddenException("Only a parent or player can apply");
    }
    const season = await this.seasons.getActiveSeason();
    const registration = await this.prisma.teamRegistration.findFirst({
      where: { id, seasonId: season.id },
    });
    if (!registration) {
      throw new NotFoundException("Registration not found");
    }
    if (!registration.isOpen) {
      throw new BadRequestException("This team is not accepting applications");
    }
    const applicant = await this.prisma.user.findUnique({ where: { id: actor.id } });
    if (!applicant) {
      throw new NotFoundException("Account not found");
    }
    const playerFirstName = dto.playerFirstName?.trim() || applicant.firstName;
    const playerLastName = dto.playerLastName?.trim() || applicant.lastName;
    const playerEmail = (dto.playerEmail ?? (actor.role === "PLAYER" ? actor.email : "")).toLowerCase().trim();
    if (!playerEmail) {
      throw new BadRequestException("Player email is required when a parent applies for a child");
    }
    const existing = await this.prisma.teamApplication.findUnique({
      where: { registrationId_applicantId: { registrationId: registration.id, applicantId: actor.id } },
    });
    if (existing) {
      throw new ConflictException("You already applied to this team");
    }
    const playerUser =
      actor.role === "PLAYER" ? applicant : await this.prisma.user.findUnique({ where: { email: playerEmail } });
    const created = await this.prisma.teamApplication.create({
      data: {
        registrationId: registration.id,
        applicantId: actor.id,
        playerFirstName,
        playerLastName,
        playerEmail,
        playerUserId: playerUser?.role === "PLAYER" ? playerUser.id : null,
        preferredPosition: dto.preferredPosition ?? null,
        note: dto.note?.trim() || null,
      },
      include: { applicant: true },
    });
    return this.toApplicationView(created);
  }

  /** Promote a PENDING application onto the roster. */
  async accept(
    registrationId: string,
    applicationId: string,
    dto: AcceptApplicationDto,
  ): Promise<{ application: TeamApplicationView; roster: CreateRosterResult }> {
    const season = await this.seasons.getActiveSeason();
    const application = await this.prisma.teamApplication.findFirst({
      where: { id: applicationId, registrationId, registration: { seasonId: season.id } },
      include: { applicant: true, registration: true },
    });
    if (!application) {
      throw new NotFoundException("Application not found");
    }
    if (application.status !== "PENDING") {
      throw new BadRequestException("Only a pending application can be accepted");
    }
    const roster = await this.teams.addRoster(application.registration.teamId, {
      userId: application.playerUserId ?? undefined,
      email: application.playerUserId ? undefined : application.playerEmail,
      firstName: application.playerUserId ? undefined : application.playerFirstName,
      lastName: application.playerUserId ? undefined : application.playerLastName,
      jerseyNum: dto.jerseyNum,
      position: dto.position ?? application.preferredPosition ?? undefined,
    });
    const updated = await this.prisma.teamApplication.update({
      where: { id: application.id },
      data: { status: "ACCEPTED", playerUserId: roster.userId },
      include: { applicant: true },
    });
    return { application: this.toApplicationView(updated), roster };
  }

  /** Decline a PENDING application. */
  async decline(registrationId: string, applicationId: string): Promise<TeamApplicationView> {
    const season = await this.seasons.getActiveSeason();
    const application = await this.prisma.teamApplication.findFirst({
      where: { id: applicationId, registrationId, registration: { seasonId: season.id } },
    });
    if (!application) {
      throw new NotFoundException("Application not found");
    }
    if (application.status !== "PENDING") {
      throw new BadRequestException("Only a pending application can be declined");
    }
    const updated = await this.prisma.teamApplication.update({
      where: { id: application.id },
      data: { status: "DECLINED" },
      include: { applicant: true },
    });
    return this.toApplicationView(updated);
  }

  /** Maps a registration row for the API. */
  private toRegistrationView(
    row: {
      id: string;
      teamId: string;
      seasonId: string;
      isOpen: boolean;
      openedById: string;
      createdAt: Date;
      team: { name: string };
      season: { name: string };
      _count: { applications: number };
    },
    staff: boolean,
  ): TeamRegistrationView {
    return {
      id: row.id,
      teamId: row.teamId,
      teamName: row.team.name,
      seasonId: row.seasonId,
      seasonName: row.season.name,
      isOpen: row.isOpen,
      openedById: row.openedById,
      createdAt: row.createdAt.toISOString(),
      applicationCount: staff ? row._count.applications : 0,
    };
  }

  /** Maps an application + applicant for the pool. */
  private toApplicationView(row: {
    id: string;
    registrationId: string;
    applicantId: string;
    playerFirstName: string;
    playerLastName: string;
    playerEmail: string;
    playerUserId: string | null;
    preferredPosition: TeamApplicationView["preferredPosition"];
    note: string | null;
    status: TeamApplicationView["status"];
    createdAt: Date;
    applicant: { firstName: string; lastName: string; role: TeamApplicationView["applicantRole"] };
  }): TeamApplicationView {
    return {
      id: row.id,
      registrationId: row.registrationId,
      applicantId: row.applicantId,
      applicantName: `${row.applicant.firstName} ${row.applicant.lastName}`,
      applicantRole: row.applicant.role,
      playerFirstName: row.playerFirstName,
      playerLastName: row.playerLastName,
      playerEmail: row.playerEmail,
      playerUserId: row.playerUserId,
      preferredPosition: row.preferredPosition,
      note: row.note,
      status: row.status,
      createdAt: row.createdAt.toISOString(),
    };
  }
}
