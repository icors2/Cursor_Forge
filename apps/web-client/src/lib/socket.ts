/**
 * Socket.io client for the live board. Auth uses the httpOnly cookie (withCredentials).
 */

import { io, type Socket } from "socket.io-client";
import { apiBase } from "./api";

/** Opens a credentialed connection to the Nest gateway. */
export function connectLiveSocket(): Socket {
  return io(apiBase(), {
    withCredentials: true,
    transports: ["websocket", "polling"],
  });
}
