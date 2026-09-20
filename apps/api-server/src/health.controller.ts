/**
 * Liveness probe for Compose and smoke scripts.
 */

import { Controller, Get } from "@nestjs/common";

/** Public health endpoint — no auth, no PII. */
@Controller("health")
export class HealthController {
  /** Returns a static ok payload so load balancers can probe the process. */
  @Get()
  getHealth(): { ok: true } {
    return { ok: true };
  }
}
