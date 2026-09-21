/**
 * Isolated users / dues plugin. Imports AuthModule for PublicUser mapping.
 */

import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { UsersController } from "./users.controller";
import { UsersService } from "./users.service";

/** Registers user directory + dues routes. */
@Module({
  imports: [AuthModule],
  controllers: [UsersController],
  providers: [UsersService],
})
export class UsersModule {}
