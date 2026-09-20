/**
 * Blocks PARENT/PLAYER portal writes when isDuesPaid is false.
 * ADMIN/COACH skip the check — they manage the club, they do not pay player dues.
 */

import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import type { RequestUser } from "./auth.types";

/** Roles that must have dues paid before volunteer signup (Setup.md portal access). */
const DUES_GATED_ROLES = new Set(["PARENT", "PLAYER"]);

/** Loads isDuesPaid from the database — never trusts a client-supplied flag. */
@Injectable()
export class DuesPaidGuard implements CanActivate {
  private readonly logger = new Logger(DuesPaidGuard.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Returns true when the actor is staff or the stored dues flag is true. */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<{ user?: RequestUser }>();
    const actor = req.user;
    if (!actor) {
      throw new ForbiddenException("Dues are unpaid");
    }
    if (!DUES_GATED_ROLES.has(actor.role)) {
      return true;
    }
    const row = await this.prisma.user.findUnique({
      where: { id: actor.id },
      select: { isDuesPaid: true },
    });
    if (!row?.isDuesPaid) {
      this.logger.warn(`dues_blocked path=${context.switchToHttp().getRequest<{ url?: string }>().url ?? "?"}`);
      throw new ForbiddenException("Dues are unpaid");
    }
    return true;
  }
}
