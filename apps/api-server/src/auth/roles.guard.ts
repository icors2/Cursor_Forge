/**
 * Enforces @Roles() after JwtAuthGuard. Logs denies without PII.
 */

import { CanActivate, ExecutionContext, ForbiddenException, Injectable, Logger } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { Role } from "@volleyball-manager/shared-types";
import { ROLES_KEY } from "./roles.decorator";
import type { RequestUser } from "./auth.types";

/** Role allowlist guard. */
@Injectable()
export class RolesGuard implements CanActivate {
  private readonly logger = new Logger(RolesGuard.name);

  constructor(private readonly reflector: Reflector) {}

  /** Returns true when no roles are required or the user role is listed. */
  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!roles || roles.length === 0) {
      return true;
    }
    const req = context.switchToHttp().getRequest<{ user?: RequestUser; method?: string; url?: string }>();
    const role = req.user?.role;
    if (role && roles.includes(role)) {
      return true;
    }
    this.logger.warn(`authz_denied method=${req.method ?? "?"} path=${req.url ?? "?"}`);
    throw new ForbiddenException("Insufficient role");
  }
}
