"use client";

/**
 * Parent/player home: open the live board for an active-season game.
 * Coaches/admins also get a Record stats link into Stat Tracking.
 */

import Link from "next/link";
import { useEffect, useState } from "react";
import type { GameSummary, PublicUser } from "@volleyball-manager/shared-types";
import { AppHeader } from "@/components/AppHeader";
import { api } from "@/lib/api";

/** Lists watchable games (active season). */
export default function LiveHomePage() {
  const [user, setUser] = useState<PublicUser | null>(null);
  const [games, setGames] = useState<GameSummary[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([api<PublicUser>("/auth/me"), api<GameSummary[]>("/games")])
      .then(([me, list]) => {
        setUser(me);
        setGames(list);
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Could not load games"));
  }, []);

  const canRecord = user?.role === "COACH" || user?.role === "ADMIN";

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <AppHeader title="Live board" />
      {error ? <p className="text-red-300">{error}</p> : null}
      <ul className="space-y-3">
        {games.map((game) => (
          <li key={game.id} className="rounded-2xl border border-emerald-900 bg-court-900/80 p-5">
            <Link href={`/live/${game.id}`} className="block hover:text-court-400">
              <p className="text-lg font-semibold">
                {game.teamName} vs {game.opponent}
              </p>
              <p className="text-sm text-emerald-100/60">{game.seasonName}</p>
            </Link>
            {canRecord ? (
              <Link
                href={`/coach/game/${game.id}`}
                className="mt-3 inline-block rounded-lg bg-court-400 px-3 py-1.5 text-sm font-semibold text-court-950"
              >
                Record stats
              </Link>
            ) : null}
          </li>
        ))}
      </ul>
      {games.length === 0 && !error ? (
        <p className="text-emerald-100/60">No games scheduled — add one on Teams or import a calendar.</p>
      ) : null}
    </main>
  );
}
