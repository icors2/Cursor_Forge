/**
 * Passport JWT strategy. Cookie first, then Authorization Bearer (curl/smoke).
 */

import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import type { Request } from "express";
import { ExtractJwt, Strategy } from "passport-jwt";
import type { JwtPayload, RequestUser } from "./auth.types";

/** Reads the access token from cookie or Bearer header. */
function tokenFromRequest(req: Request): string | null {
  const cookie = req.cookies?.access_token;
  if (typeof cookie === "string" && cookie.length > 0) {
    return cookie;
  }
  return ExtractJwt.fromAuthHeaderAsBearerToken()(req);
}

/** Validates signed JWTs and maps them to RequestUser. */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error("JWT_SECRET is required");
    }
    super({
      jwtFromRequest: tokenFromRequest,
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  /** Builds the request user from validated claims. */
  validate(payload: JwtPayload): RequestUser {
    if (!payload.sub || !payload.role || !payload.email) {
      throw new UnauthorizedException();
    }
    return { id: payload.sub, email: payload.email, role: payload.role };
  }
}
