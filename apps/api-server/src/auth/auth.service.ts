/**
 * Login, public register (PARENT/PLAYER or keyed COACH), and coach invite keygen.
 */

import { ConflictException, Injectable, Logger, NotFoundException, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import {
  DEFAULT_THEME_COLOR,
  type CoachInviteKeyView,
  type CreatedCoachInviteKey,
  type PublicUser,
  type RegisterRole,
} from "@volleyball-manager/shared-types";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { PrismaService } from "../prisma/prisma.service";
import type { JwtPayload } from "./auth.types";

/** Dummy bcrypt hash used so a missing-key miss still costs a compare. */
const DUMMY_KEY_HASH = "$2a$10$CwTycUXWue0Thq9StjUM0uJ8xK8xK8xK8xK8xK8xK8xK8xK8xK8xK";

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

  /**
   * Self-serve signup. PARENT/PLAYER need no key. COACH consumes a one-time hashed invite.
   * ADMIN cannot be chosen. Returns a signed token so the new account can use the portal.
   */
  async register(
    email: string,
    password: string,
    firstName: string,
    lastName: string,
    role: RegisterRole,
    coachKey?: string,
  ): Promise<{ token: string; user: PublicUser }> {
    const normalized = email.toLowerCase().trim();
    const existing = await this.prisma.user.findUnique({ where: { email: normalized } });
    if (existing) {
      throw new ConflictException("Email already exists");
    }
    if (role === "COACH") {
      return this.registerCoach(normalized, password, firstName, lastName, coachKey ?? "");
    }
    const created = await this.prisma.user.create({
      data: {
        email: normalized,
        passwordHash: await bcrypt.hash(password, 10),
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        role,
        isDuesPaid: false,
      },
    });
    this.logger.log(`user_registered role=${created.role}`);
    return this.issueSession(created);
  }

  /**
   * ADMIN generates a high-entropy coach key. Only the bcrypt hash is stored.
   * The plaintext is returned once and is never written to the database or logs.
   */
  async generateCoachKey(createdById: string, label?: string): Promise<CreatedCoachInviteKey> {
    const plaintext = `vmck_${randomBytes(24).toString("base64url")}`;
    const row = await this.prisma.coachInviteKey.create({
      data: {
        keyHash: await bcrypt.hash(plaintext, 10),
        label: label?.trim() ? label.trim() : null,
        createdById,
      },
    });
    this.logger.log(`coach_key_generated id=${row.id}`);
    return {
      id: row.id,
      key: plaintext,
      label: row.label,
      createdAt: row.createdAt.toISOString(),
    };
  }

  /** Lists invite metadata for ADMIN. Never includes keyHash or plaintext. */
  async listCoachKeys(): Promise<CoachInviteKeyView[]> {
    const rows = await this.prisma.coachInviteKey.findMany({
      orderBy: { createdAt: "desc" },
    });
    return rows.map((row) => ({
      id: row.id,
      label: row.label,
      createdAt: row.createdAt.toISOString(),
      usedAt: row.usedAt ? row.usedAt.toISOString() : null,
      usedById: row.usedById,
    }));
  }

  /** Deletes an unused invite. Used keys stay as an audit row. */
  async revokeCoachKey(id: string): Promise<{ ok: true }> {
    const row = await this.prisma.coachInviteKey.findUnique({ where: { id } });
    if (!row) {
      throw new NotFoundException("Coach key not found");
    }
    if (row.usedAt) {
      throw new ConflictException("Used keys cannot be revoked");
    }
    await this.prisma.coachInviteKey.delete({ where: { id } });
    this.logger.log(`coach_key_revoked id=${id}`);
    return { ok: true };
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
    themeColor?: string | null;
  }): PublicUser {
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
      isDuesPaid: user.isDuesPaid,
      themeColor: user.themeColor || DEFAULT_THEME_COLOR,
    };
  }

  /**
   * Creates a COACH by matching bcrypt hashes of unused invites, then claiming one row.
   * The plaintext key is never logged.
   */
  private async registerCoach(
    email: string,
    password: string,
    firstName: string,
    lastName: string,
    coachKey: string,
  ): Promise<{ token: string; user: PublicUser }> {
    const created = await this.prisma.$transaction(async (tx) => {
      const unused = await tx.coachInviteKey.findMany({ where: { usedAt: null } });
      let matchId: string | null = null;
      for (const row of unused) {
        if (await bcrypt.compare(coachKey, row.keyHash)) {
          matchId = row.id;
          break;
        }
      }
      if (!matchId) {
        await bcrypt.compare(coachKey, DUMMY_KEY_HASH);
        throw new UnauthorizedException("Invalid coach key");
      }
      const user = await tx.user.create({
        data: {
          email,
          passwordHash: await bcrypt.hash(password, 10),
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          role: "COACH",
          isDuesPaid: false,
        },
      });
      const claimed = await tx.coachInviteKey.updateMany({
        where: { id: matchId, usedAt: null },
        data: { usedAt: new Date(), usedById: user.id },
      });
      if (claimed.count !== 1) {
        throw new UnauthorizedException("Invalid coach key");
      }
      this.logger.log(`user_registered role=COACH keyId=${matchId}`);
      return user;
    });
    return this.issueSession(created);
  }

  /** Signs a JWT for a newly created account. */
  private async issueSession(user: {
    id: string;
    email: string;
    role: PublicUser["role"];
    firstName: string;
    lastName: string;
    isDuesPaid: boolean;
    themeColor?: string | null;
  }): Promise<{ token: string; user: PublicUser }> {
    const payload: JwtPayload = { sub: user.id, email: user.email, role: user.role };
    const token = await this.jwt.signAsync(payload);
    return { token, user: this.toPublic(user) };
  }
}
