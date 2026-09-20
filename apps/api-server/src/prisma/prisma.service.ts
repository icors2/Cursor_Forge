/**
 * Nest wrapper around PrismaClient. Parameterized queries only — no raw SQL with user input.
 */

import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";

/** Shared database client. */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  /** Connects the pool when Nest boots. */
  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  /** Disconnects the pool on shutdown. */
  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
