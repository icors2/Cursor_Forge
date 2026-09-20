/**
 * Extracts the JWT principal from the request (set by JwtAuthGuard).
 */

import { createParamDecorator, type ExecutionContext } from "@nestjs/common";
import type { RequestUser } from "./auth.types";

/** Parameter decorator: @CurrentUser() user: RequestUser */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): RequestUser => {
    const req = ctx.switchToHttp().getRequest<{ user: RequestUser }>();
    return req.user;
  },
);
