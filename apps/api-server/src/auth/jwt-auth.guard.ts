/**
 * Requires a valid JWT on HTTP routes.
 */

import { Injectable } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";

/** Passport AuthGuard('jwt') wrapper. */
@Injectable()
export class JwtAuthGuard extends AuthGuard("jwt") {}
