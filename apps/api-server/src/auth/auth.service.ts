/**
 * Login and public-user mapping. No self-serve register in this slice.
 */

import { Injectable, Logger, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import type { PublicUser } from "@volleyball-manager/shared-types";
import bcrypt from "bcryptjs";
import { PrismaService } from "../prisma/prisma.service";
import type { JwtPayload } from "./auth.types";

/** Auth use-cases. */
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  /**
   * Verifies email/password and returns a signed token plus public profile.
   * Failures are logged without the email or password.
   */
  async login(email: string, password: string): Promise<{ token: string; user: PublicUser }> {
    const user = await this.prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
    if (!user) {
      this.logger.warn("login_failed");
      throw new UnauthorizedException("Invalid credentials");
    }
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      this.logger.warn("login_failed");
      throw new UnauthorizedException("Invalid credentials");
    }
    const payload: JwtPayload = { sub: user.id, email: user.email, role: user.role };
    const token = await this.jwt.signAsync(payload);
    return { token, user: this.toPublic(user) };
  }

  /** Loads a public profile by id (for /auth/me). */
  async getPublicUser(id: string): Promise<PublicUser | null> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    return user ? this.toPublic(user) : null;
  }

  /** Maps a User row to the public DTO. Omits passwordHash. */
  toPublic(user: {
    id: string;
    email: string;
    role: PublicUser["role"];
    firstName: string;
    lastName: string;
    isDuesPaid: boolean;
  }): PublicUser {
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
      isDuesPaid: user.isDuesPaid,
    };
  }
}
