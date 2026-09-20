/**
 * Socket.io gateway. Clients subscribe to a game room; the HTTP write path broadcasts.
 */

import { Logger } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
} from "@nestjs/websockets";
import type { StatEvent } from "@volleyball-manager/shared-types";
import type { Server, Socket } from "socket.io";
import { ActiveSeasonService } from "../common/active-season.service";
import { PrismaService } from "../prisma/prisma.service";
import type { JwtPayload, RequestUser } from "../auth/auth.types";

/** Cookie / auth handshake helpers for Socket.io. */
function tokenFromSocket(socket: Socket): string | null {
  const fromAuth = socket.handshake.auth?.token;
  if (typeof fromAuth === "string" && fromAuth.length > 0) {
    return fromAuth;
  }
  const header = socket.handshake.headers.authorization;
  if (typeof header === "string" && header.startsWith("Bearer ")) {
    return header.slice(7);
  }
  const cookieHeader = socket.handshake.headers.cookie ?? "";
  const match = /(?:^|;\s*)access_token=([^;]+)/.exec(cookieHeader);
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

/** Authenticated live-stat channel. CORS origins match HTTP. */
@WebSocketGateway({
  cors: {
    origin: (process.env.WEB_ORIGIN ?? "http://127.0.0.1:3010,http://localhost:3010").split(","),
    credentials: true,
  },
})
export class StatsGateway implements OnGatewayConnection {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(StatsGateway.name);

  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
    private readonly seasons: ActiveSeasonService,
  ) {}

  /** Rejects connections without a valid JWT. */
  async handleConnection(socket: Socket): Promise<void> {
    try {
      const token = tokenFromSocket(socket);
      if (!token) {
        throw new WsException("Missing token");
      }
      const payload = await this.jwt.verifyAsync<JwtPayload>(token);
      const user: RequestUser = { id: payload.sub, email: payload.email, role: payload.role };
      socket.data.user = user;
    } catch {
      this.logger.warn("socket_auth_failed");
      socket.disconnect(true);
    }
  }

  /** Joins game:<id> after confirming the game is in the active season. */
  @SubscribeMessage("game:join")
  async joinGame(@ConnectedSocket() socket: Socket, @MessageBody() body: { gameId?: string }): Promise<{ ok: true }> {
    if (!socket.data.user) {
      throw new WsException("Unauthorized");
    }
    if (!body?.gameId) {
      throw new WsException("gameId required");
    }
    const seasonId = await this.seasons.resolveSeasonId({});
    const game = await this.prisma.game.findFirst({ where: { id: body.gameId, seasonId } });
    if (!game) {
      throw new WsException("Game not found in the active season");
    }
    await socket.join(`game:${game.id}`);
    return { ok: true };
  }

  /** Broadcasts a persisted event to everyone watching the game. */
  emitStatCreated(event: StatEvent): void {
    this.server.to(`game:${event.gameId}`).emit("stat.created", event);
  }
}
