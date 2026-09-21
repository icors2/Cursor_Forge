"use client";

/**
 * Parent/player home: open the live board for the active-season game.
 */

import Link from "next/link";
import { useEffect, useState } from "react";
import type { GameSummary } from "@volleyball-manager/shared-types";
import { AppHeader } from "@/components/AppHeader";
import { api } from "@/lib/api";

/** Lists watchable games (active season). */
export default function LiveHomePage() {
  const [games, setGames] = useState<GameSummary[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<GameSummary[]>("/games")
      .then(setGames)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Could not load games"));
  }, []);

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <AppHeader title="Live board" />
      {error ? <p className="text-red-300">{error}</p> : null}
      <ul className="space-y-3">
        {games.map((game) => (
          <li key={game.id}>
            <Link
              href={`/live/${game.id}`}
              className="block rounded-2xl border border-emerald-900 bg-court-900/80 p-5 hover:border-court-400"
            >
              <p className="text-lg font-semibold">
                {game.teamName} vs {game.opponent}
              </p>
              <p className="text-sm text-emerald-100/60">{game.seasonName}</p>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
