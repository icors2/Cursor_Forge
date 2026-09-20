/**
 * Login, session probe, and logout. No generic user PATCH (blocks isDuesPaid escalation).
 */

import { Body, Controller, Get, HttpException, HttpStatus, Post, Req, Res, UseGuards } from "@nestjs/common";
import type { Request, Response } from "express";
import type { LoginResponse, PublicUser } from "@volleyball-manager/shared-types";
import { AuthService } from "./auth.service";
import { LoginDto } from "./auth.dto";
import { CurrentUser } from "./current-user.decorator";
import { JwtAuthGuard } from "./jwt-auth.guard";
import type { RequestUser } from "./auth.types";

/** Cookie max-age aligned with default JWT expiry (8h). */
const COOKIE_MS = 8 * 60 * 60 * 1000;

/** In-memory login throttle: 80 attempts / IP / minute (full `npm run smoke` logs in many demo users). */
const loginAttempts = new Map<string, { count: number; resetAt: number }>();

/** Returns true when the caller should receive 429. */
function isLoginThrottled(ip: string): boolean {
  const now = Date.now();
  const row = loginAttempts.get(ip);
  if (!row || now > row.resetAt) {
    loginAttempts.set(ip, { count: 1, resetAt: now + 60_000 });
    return false;
  }
  row.count += 1;
  return row.count > 80;
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
    if (isLoginThrottled(ip)) {
      throw new HttpException("Too many login attempts", HttpStatus.TOO_MANY_REQUESTS);
    }
    const { token, user } = await this.auth.login(body.email, body.password);
    setAccessCookie(res, token);
    return { user };
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
      };
    }
    return user;
  }
}
