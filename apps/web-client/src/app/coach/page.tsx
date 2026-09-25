"use client";

/**
 * Stat Tracking home: pick the active-season game, then open the pad.
 */

import Link from "next/link";
import { useEffect, useState } from "react";
import type { GameSummary } from "@volleyball-manager/shared-types";
import { AppHeader } from "@/components/AppHeader";
import { api } from "@/lib/api";

/** Lists games returned by GET /games (active season only). */
export default function CoachHomePage() {
  const [games, setGames] = useState<GameSummary[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<GameSummary[]>("/games")
      .then(setGames)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Could not load games"));
  }, []);

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <AppHeader title="Stat Tracking" />
      {error ? <p className="text-red-300">{error}</p> : null}
      <ul className="space-y-3">
        {games.map((game) => (
          <li key={game.id}>
            <Link
              href={`/coach/game/${game.id}`}
              className="block rounded-2xl border border-emerald-900 bg-court-900/80 p-5 hover:border-court-400"
            >
              <p className="text-lg font-semibold">
                {game.teamName} vs {game.opponent}
              </p>
              <p className="text-sm text-emerald-100/60">
                {game.seasonName} · {new Date(game.scheduledAt).toUTCString()}
              </p>
            </Link>
          </li>
        ))}
      </ul>
      {games.length === 0 && !error ? (
        <p className="text-emerald-100/60">No games scheduled — add one on Teams or import a calendar.</p>
      ) : null}
    </main>
  );
}
