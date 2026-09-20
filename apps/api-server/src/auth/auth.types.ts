/**
 * JWT payload and request user shapes (no password fields).
 */

import type { Role } from "@volleyball-manager/shared-types";

/** Claims stored in the signed JWT. */
export interface JwtPayload {
  /** User id (subject). */
  sub: string;
  /** Login email (used to rebuild the request user). */
  email: string;
  /** RBAC role. */
  role: Role;
}

/** Authenticated principal attached to HTTP and Socket.io contexts. */
export interface RequestUser {
  /** User id. */
  id: string;
  /** Login email. */
  email: string;
  /** RBAC role. */
  role: Role;
}
