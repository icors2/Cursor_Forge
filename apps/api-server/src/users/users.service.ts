/**
 * ADMIN user directory + dues flag. There is no generic PATCH /users/:id.
 */

import { ConflictException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import type { PublicUser } from "@volleyball-manager/shared-types";
import bcrypt from "bcryptjs";
import { AuthService } from "../auth/auth.service";
import { PrismaService } from "../prisma/prisma.service";
import type { ProvisionUserDto, UpdateDuesDto } from "./users.dto";

/** Isolated users / dues domain service. */
@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auth: AuthService,
  ) {}

  /** Lists public profiles for the dues admin table. */
  async list(): Promise<PublicUser[]> {
    const rows = await this.prisma.user.findMany({
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    });
    return rows.map((row) => this.auth.toPublic(row));
  }

  /**
   * ADMIN-provisioned account. isDuesPaid starts false — never accepted from the body.
   * This is not public self-serve signup.
   */
  async provision(dto: ProvisionUserDto): Promise<PublicUser> {
    const email = dto.email.toLowerCase().trim();
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictException("Email already exists");
    }
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const created = await this.prisma.user.create({
      data: {
        email,
        passwordHash,
        firstName: dto.firstName.trim(),
        lastName: dto.lastName.trim(),
        role: dto.role,
        isDuesPaid: false,
      },
    });
    this.logger.log(`user_provisioned role=${created.role}`);
    return this.auth.toPublic(created);
  }

  /** Dedicated dues write. Logs the change without email or name. */
  async updateDues(id: string, dto: UpdateDuesDto): Promise<PublicUser> {
    const existing = await this.prisma.user.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException("User not found");
    }
    const updated = await this.prisma.user.update({
      where: { id },
      data: { isDuesPaid: dto.isDuesPaid },
    });
    this.logger.log(`dues_updated paid=${updated.isDuesPaid}`);
    return this.auth.toPublic(updated);
  }
}
