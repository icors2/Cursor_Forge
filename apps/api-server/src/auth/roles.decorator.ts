/**
 * Declares which roles may call a handler. Empty metadata means any authenticated user.
 */

import { SetMetadata } from "@nestjs/common";
import type { Role } from "@volleyball-manager/shared-types";

/** Reflector key read by RolesGuard. */
export const ROLES_KEY = "roles";

/**
 * Restricts a route to the given roles (e.g. COACH + ADMIN for stat writes).
 */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
