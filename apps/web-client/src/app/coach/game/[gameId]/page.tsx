"use client";

/**
 * Coach stat pad: tap Kill/Ace/Block/Dig/Error to insert a Stat event.
 */

import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { GameDetail, StatEvent, StatType } from "@volleyball-manager/shared-types";
import { STAT_TYPES } from "@volleyball-manager/shared-types";
import { AppHeader } from "@/components/AppHeader";
import { api } from "@/lib/api";

/** Button labels for the five event types. */
const LABELS: Record<StatType, string> = {
  KILL: "Kill",
  ACE: "Ace",
  BLOCK: "Block",
  DIG: "Dig",
  ERROR: "Error",
};

/** Interactive pad for one active-season game. */
export default function CoachGamePage() {
  const params = useParams<{ gameId: string }>();
  const gameId = params.gameId;
  const [game, setGame] = useState<GameDetail | null>(null);
  const [selectedRosterId, setSelectedRosterId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [lastEvent, setLastEvent] = useState<StatEvent | null>(null);

  useEffect(() => {
    api<GameDetail>(`/games/${gameId}`)
      .then((detail) => {
        setGame(detail);
        setSelectedRosterId((current) => current ?? detail.roster[0]?.id ?? null);
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Could not load game"));
  }, [gameId]);

  const player = game?.roster.find((row) => row.id === selectedRosterId) ?? game?.roster[0];

  /** Inserts one event row via POST /stats (server broadcasts to the live board). */
  async function handleRecord(type: StatType): Promise<void> {
    if (!player) return;
    setPending(true);
    setError(null);
    try {
      const event = await api<StatEvent>("/stats", {
        method: "POST",
        body: JSON.stringify({ gameId, rosterId: player.id, type }),
      });
      setLastEvent(event);
      setGame((current) => (current ? { ...current, stats: [...current.stats, event] } : current));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not record stat");
    } finally {
      setPending(false);
    }
  }

  const counts = useMemo(() => {
    const next: Record<StatType, number> = { KILL: 0, ACE: 0, BLOCK: 0, DIG: 0, ERROR: 0 };
    for (const stat of game?.stats ?? []) {
      next[stat.type] += 1;
    }
    return next;
  }, [game?.stats]);

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <AppHeader title={game ? `${game.teamName} vs ${game.opponent}` : "Loading game"} />
      {error ? <p className="mb-4 text-red-300">{error}</p> : null}
      {player ? (
        <section className="rounded-2xl border border-emerald-900 bg-court-900/80 p-6">
          <p className="text-sm text-emerald-100/60">Rostered player</p>
          {game && game.roster.length > 1 ? (
            <select
              className="mt-2 w-full rounded-lg border border-emerald-800 bg-court-950 px-3 py-2"
              value={player.id}
              onChange={(e) => setSelectedRosterId(e.target.value)}
              aria-label="Player"
            >
              {game.roster.map((row) => (
                <option key={row.id} value={row.id}>
                  #{row.jerseyNum ?? "—"} {row.firstName} {row.lastName}
                </option>
              ))}
            </select>
          ) : (
            <p className="text-2xl font-semibold">
              #{player.jerseyNum ?? "—"} {player.firstName} {player.lastName}
            </p>
          )}
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
            {STAT_TYPES.map((type) => (
              <button
                key={type}
                type="button"
                disabled={pending}
                onClick={() => handleRecord(type)}
                className="rounded-xl bg-court-600 px-3 py-4 text-lg font-semibold text-white shadow hover:bg-court-400 hover:text-court-950 disabled:opacity-50"
              >
                {LABELS[type]}
                <span className="mt-1 block text-xs font-normal opacity-80">{counts[type]}</span>
              </button>
            ))}
          </div>
          {lastEvent ? (
            <p className="mt-4 text-sm text-court-400">
              Recorded {lastEvent.type} at {new Date(lastEvent.timestamp).toISOString()}
            </p>
          ) : null}
        </section>
      ) : (
        <p className="text-emerald-100/60">No rostered player on this game.</p>
      )}
    </main>
  );
}
