/**
 * Global Prisma module so feature modules do not construct their own clients.
 */

import { Global, Module } from "@nestjs/common";
import { PrismaService } from "./prisma.service";

/** Provides a single PrismaService for the process. */
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
