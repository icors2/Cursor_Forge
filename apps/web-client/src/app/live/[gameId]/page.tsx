"use client";

/**
 * Parent live board. Subscribes to Socket.io `stat.created` — no full page reload.
 */

import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { GameDetail, StatEvent, StatType } from "@volleyball-manager/shared-types";
import { AppHeader } from "@/components/AppHeader";
import { api } from "@/lib/api";
import { connectLiveSocket } from "@/lib/socket";

/** Running totals derived from event rows (read-side aggregation). */
function tally(stats: StatEvent[]): Record<StatType, number> {
  const next: Record<StatType, number> = { KILL: 0, ACE: 0, BLOCK: 0, DIG: 0, ERROR: 0 };
  for (const stat of stats) next[stat.type] += 1;
  return next;
}

/** Live spectator view. */
export default function LiveBoardPage() {
  const params = useParams<{ gameId: string }>();
  const gameId = params.gameId;
  const [game, setGame] = useState<GameDetail | null>(null);
  const [stats, setStats] = useState<StatEvent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [live, setLive] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api<GameDetail>(`/games/${gameId}`)
      .then((detail) => {
        if (cancelled) return;
        setGame(detail);
        setStats(detail.stats);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not load game");
      });
    return () => {
      cancelled = true;
    };
  }, [gameId]);

  useEffect(() => {
    const socket = connectLiveSocket();
    socket.on("connect", () => {
      setLive(true);
      socket.emit("game:join", { gameId });
    });
    socket.on("disconnect", () => setLive(false));
    socket.on("stat.created", (event: StatEvent) => {
      if (event.gameId !== gameId) return;
      setStats((current) => (current.some((row) => row.id === event.id) ? current : [...current, event]));
    });
    return () => {
      socket.disconnect();
    };
  }, [gameId]);

  const counts = useMemo(() => tally(stats), [stats]);

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <AppHeader title={game ? `${game.teamName} vs ${game.opponent}` : "Live board"} />
      <p className="mb-4 text-sm text-emerald-100/60">{live ? "Live updates on" : "Connecting…"}</p>
      {error ? <p className="mb-4 text-red-300">{error}</p> : null}
      <dl className="mb-6 grid grid-cols-5 gap-2 text-center">
        {(["KILL", "ACE", "BLOCK", "DIG", "ERROR"] as StatType[]).map((type) => (
          <div key={type} className="rounded-xl border border-emerald-900 bg-court-900/80 p-3">
            <dt className="text-xs uppercase text-emerald-100/50">{type}</dt>
            <dd className="text-2xl font-semibold text-court-400">{counts[type]}</dd>
          </div>
        ))}
      </dl>
      <ol className="space-y-2">
        {[...stats].reverse().map((stat) => (
          <li key={stat.id} className="rounded-xl border border-emerald-900/80 bg-court-900/60 px-4 py-3">
            <p className="font-medium">
              {stat.type} · #{stat.jerseyNum ?? "—"} {stat.playerName}
            </p>
            <p className="text-xs text-emerald-100/50">{stat.timestamp}</p>
          </li>
        ))}
      </ol>
    </main>
  );
}
