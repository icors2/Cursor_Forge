/**
 * JWT auth module. Secret comes from JWT_SECRET (required).
 */

import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { DuesPaidGuard } from "./dues-paid.guard";
import { JwtStrategy } from "./jwt.strategy";

/** Registers Passport + JWT signing. */
@Module({
  imports: [
    PassportModule.register({ defaultStrategy: "jwt" }),
    JwtModule.registerAsync({
      useFactory: () => {
        const secret = process.env.JWT_SECRET;
        if (!secret) {
          throw new Error("JWT_SECRET is required");
        }
        return {
          secret,
          signOptions: { expiresIn: process.env.JWT_EXPIRES_IN ?? "8h" },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, DuesPaidGuard],
  exports: [AuthService, JwtModule, DuesPaidGuard],
})
export class AuthModule {}
