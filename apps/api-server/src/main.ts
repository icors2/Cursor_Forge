/**
 * HTTP + Socket.io bootstrap. Binds 0.0.0.0:$PORT for containers.
 */

import "reflect-metadata";
import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import type { NextFunction, Request, Response } from "express";
import cookieParser from "cookie-parser";
import { AppModule } from "./app.module";

/** Allowed browser origins for credentialed CORS (comma-separated WEB_ORIGIN). */
function parseOrigins(): string[] {
  const raw = process.env.WEB_ORIGIN ?? "http://127.0.0.1:3010,http://localhost:3010";
  return raw
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

/**
 * Starts the NestJS API with cookies, validation, and explicit CORS.
 */
async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { cors: false });
  const origins = parseOrigins();

  app.use(cookieParser());
  app.enableCors({
    origin: origins,
    credentials: true,
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.use((_req: Request, res: Response, next: NextFunction) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Referrer-Policy", "no-referrer");
    next();
  });

  const port = Number(process.env.PORT ?? process.env.API_PORT ?? 4010);
  await app.listen(port, "0.0.0.0");
}

bootstrap().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
