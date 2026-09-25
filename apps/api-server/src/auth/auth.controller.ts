/**
 * Login, register, coach invite keys, session probe, and logout.
 * No generic user PATCH (blocks isDuesPaid escalation).
 */

import { Body, Controller, Delete, Get, HttpException, HttpStatus, Param, Post, Req, Res, UseGuards } from "@nestjs/common";
import type { Request, Response } from "express";
import {
  DEFAULT_THEME_COLOR,
  type CoachInviteKeyView,
  type CreatedCoachInviteKey,
  type LoginResponse,
  type PublicUser,
} from "@volleyball-manager/shared-types";
import { AuthService } from "./auth.service";
import { CreateCoachInviteKeyDto, LoginDto, RegisterDto } from "./auth.dto";
import { CurrentUser } from "./current-user.decorator";
import { JwtAuthGuard } from "./jwt-auth.guard";
import { Roles } from "./roles.decorator";
import { RolesGuard } from "./roles.guard";
import type { RequestUser } from "./auth.types";

/** Cookie max-age aligned with default JWT expiry (8h). */
const COOKIE_MS = 8 * 60 * 60 * 1000;

/** In-memory login throttle: 80 attempts / IP / minute (full `npm run smoke` logs in many demo users). */
const loginAttempts = new Map<string, { count: number; resetAt: number }>();
/** Separate register throttle so signup cannot be used to flood account creation. */
const registerAttempts = new Map<string, { count: number; resetAt: number }>();

/** Returns true when the caller should receive 429. */
function isThrottled(store: Map<string, { count: number; resetAt: number }>, ip: string, max: number): boolean {
  const now = Date.now();
  const row = store.get(ip);
  if (!row || now > row.resetAt) {
    store.set(ip, { count: 1, resetAt: now + 60_000 });
    return false;
  }
  row.count += 1;
  return row.count > max;
}

/** Sets the httpOnly access_token cookie used by the web client and Socket.io. */
function setAccessCookie(res: Response, token: string): void {
  const secure = process.env.NODE_ENV === "production";
  res.cookie("access_token", token, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    maxAge: COOKIE_MS,
    path: "/",
  });
}

/** Auth HTTP routes. */
@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  /** Authenticates a seeded (or provisioned) user. */
  @Post("login")
  async login(
    @Body() body: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<LoginResponse> {
    const ip = req.ip ?? "unknown";
    if (isThrottled(loginAttempts, ip, 80)) {
      throw new HttpException("Too many login attempts", HttpStatus.TOO_MANY_REQUESTS);
    }
    const { token, user } = await this.auth.login(body.email, body.password);
    setAccessCookie(res, token);
    return { user };
  }

  /** PARENT/PLAYER signup, or COACH when a one-time invite key is supplied. */
  @Post("register")
  async register(
    @Body() body: RegisterDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<LoginResponse> {
    const ip = req.ip ?? "unknown";
    if (isThrottled(registerAttempts, ip, 20)) {
      throw new HttpException("Too many registration attempts", HttpStatus.TOO_MANY_REQUESTS);
    }
    const { token, user } = await this.auth.register(
      body.email,
      body.password,
      body.firstName,
      body.lastName,
      body.role,
      body.coachKey,
    );
    setAccessCookie(res, token);
    return { user };
  }

  /** ADMIN generates a one-time coach key. Plaintext is returned once. */
  @Post("coach-keys")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("ADMIN")
  generateCoachKey(
    @CurrentUser() actor: RequestUser,
    @Body() body: CreateCoachInviteKeyDto,
  ): Promise<CreatedCoachInviteKey> {
    return this.auth.generateCoachKey(actor.id, body.label);
  }

  /** ADMIN lists invite metadata (no hashes or plaintext). */
  @Get("coach-keys")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("ADMIN")
  listCoachKeys(): Promise<CoachInviteKeyView[]> {
    return this.auth.listCoachKeys();
  }

  /** ADMIN deletes an unused invite. */
  @Delete("coach-keys/:id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("ADMIN")
  revokeCoachKey(@Param("id") id: string): Promise<{ ok: true }> {
    return this.auth.revokeCoachKey(id);
  }

  /** Clears the session cookie. */
  @Post("logout")
  logout(@Res({ passthrough: true }) res: Response): { ok: true } {
    res.clearCookie("access_token", { path: "/" });
    return { ok: true };
  }

  /** Returns the current user from the JWT. */
  @Get("me")
  @UseGuards(JwtAuthGuard)
  async me(@CurrentUser() actor: RequestUser): Promise<PublicUser> {
    const user = await this.auth.getPublicUser(actor.id);
    if (!user) {
      return {
        id: actor.id,
        email: actor.email,
        role: actor.role,
        firstName: "",
        lastName: "",
        isDuesPaid: false,
        themeColor: DEFAULT_THEME_COLOR,
      };
    }
    return user;
  }
}
