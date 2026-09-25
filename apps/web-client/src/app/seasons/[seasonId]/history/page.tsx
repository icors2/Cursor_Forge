"use client";

/**
 * Printable season history: games plus per-player stat totals.
 */

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import type { SeasonHistoryView, StatType } from "@volleyball-manager/shared-types";
import { STAT_TYPES } from "@volleyball-manager/shared-types";
import { AppHeader } from "@/components/AppHeader";
import { api } from "@/lib/api";
import { utcLabel } from "@/lib/datetime";

/** Season history + print view. */
export default function SeasonHistoryPage() {
  const params = useParams<{ seasonId: string }>();
  const seasonId = params.seasonId;
  const [history, setHistory] = useState<SeasonHistoryView | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<SeasonHistoryView>(`/seasons/${seasonId}/history`)
      .then(setHistory)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Could not load history"));
  }, [seasonId]);

  return (
    <main className="mx-auto max-w-3xl px-6 py-10 print:max-w-none print:px-0 print:text-black">
      <div className="print:hidden">
        <AppHeader title={history ? `${history.season.name} history` : "Season history"} />
        <div className="mb-6 flex gap-3">
          <Link href="/seasons" className="rounded-lg border border-emerald-800 px-3 py-1.5 text-sm">
            Back to seasons
          </Link>
          <button
            type="button"
            onClick={() => window.print()}
            className="rounded-lg bg-court-400 px-3 py-1.5 text-sm font-semibold text-court-950"
          >
            Print
          </button>
        </div>
      </div>
      {error ? <p className="text-red-300 print:text-black">{error}</p> : null}
      {history ? (
        <article className="season-history">
          <h2 className="hidden text-2xl font-semibold print:block">
            {history.season.name} ({history.season.year})
          </h2>
          <section className="mb-8">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide">Games</h3>
            <ul className="space-y-2">
              {history.games.map((game) => (
                <li key={game.id} className="rounded-xl border border-emerald-900/80 bg-court-900/60 px-4 py-3 print:border-black print:bg-white">
                  {game.teamName} vs {game.opponent} · {utcLabel(game.scheduledAt)}
                </li>
              ))}
            </ul>
            {history.games.length === 0 ? <p className="text-sm text-emerald-100/50 print:text-black">No games.</p> : null}
          </section>
          <section>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide">Player totals</h3>
            <table className="w-full text-left text-sm">
              <thead>
                <tr>
                  <th className="pb-2">Player</th>
                  {STAT_TYPES.map((type) => (
                    <th key={type} className="pb-2">
                      {type}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {history.players.map((player) => (
                  <tr key={player.userId}>
                    <td className="py-1">
                      #{player.jerseyNum ?? "—"} {player.playerName}
                    </td>
                    {STAT_TYPES.map((type: StatType) => (
                      <td key={type} className="py-1">
                        {player.totals[type]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {history.players.length === 0 ? <p className="text-sm text-emerald-100/50 print:text-black">No stats recorded.</p> : null}
          </section>
        </article>
      ) : null}
    </main>
  );
}
