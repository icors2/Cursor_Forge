"use client";

/**
 * Season list + ADMIN archiveSeason. Historical games use ?historical=true&seasonId=.
 */

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import type {
  ArchiveSeasonRequest,
  ArchiveSeasonResult,
  GameSummary,
  PublicUser,
  SeasonView,
} from "@volleyball-manager/shared-types";
import { AppHeader } from "@/components/AppHeader";
import { api } from "@/lib/api";

/** Season archive + historical browse. */
export default function SeasonsPage() {
  const [user, setUser] = useState<PublicUser | null>(null);
  const [seasons, setSeasons] = useState<SeasonView[]>([]);
  const [historical, setHistorical] = useState<GameSummary[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [name, setName] = useState("Spring 2027");
  const [year, setYear] = useState(2027);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  /** Reloads seasons and the signed-in user. */
  async function reload(): Promise<void> {
    const me = await api<PublicUser>("/auth/me");
    setUser(me);
    const list = await api<SeasonView[]>("/seasons");
    setSeasons(list);
  }

  useEffect(() => {
    reload().catch((err: unknown) => setError(err instanceof Error ? err.message : "Could not load seasons"));
  }, []);

  /** Loads games for a non-active season via the historical query flags. */
  async function handleOpenHistorical(season: SeasonView): Promise<void> {
    setSelectedId(season.id);
    setError(null);
    try {
      const games = await api<GameSummary[]>(`/games?historical=true&seasonId=${season.id}`);
      setHistorical(games);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load historical games");
    }
  }

  /** ADMIN archive: freeze current season, start an empty one. */
  async function handleArchive(event: FormEvent): Promise<void> {
    event.preventDefault();
    setError(null);
    setNotice(null);
    const body: ArchiveSeasonRequest = { name, year };
    try {
      const result = await api<ArchiveSeasonResult>("/seasons/archive", {
        method: "POST",
        body: JSON.stringify(body),
      });
      setNotice(`Archived ${result.archived.name}. Active season is now ${result.created.name}.`);
      setHistorical([]);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not archive season");
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <AppHeader title="Seasons" />
      <p className="mb-6 text-sm text-emerald-100/60">
        Team, game, and stat lists default to the active season. Historical views need both flags.
      </p>
      {error ? <p className="mb-4 text-red-300">{error}</p> : null}
      {notice ? <p className="mb-4 text-court-400">{notice}</p> : null}

      <ul className="mb-8 space-y-3">
        {seasons.map((season) => (
          <li key={season.id} className="rounded-2xl border border-emerald-900 bg-court-900/80 p-5">
            <p className="text-lg font-semibold">
              {season.name} {season.isActive ? "· active" : ""}
            </p>
            <p className="text-sm text-emerald-100/60">{season.year}</p>
            {season.isActive ? (
              <Link href="/live" className="mt-2 inline-block text-sm text-court-400 underline">
                Open active games
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => handleOpenHistorical(season)}
                className="mt-2 text-sm text-court-400 underline"
              >
                View historical games
              </button>
            )}
          </li>
        ))}
      </ul>

      {selectedId ? (
        <section className="mb-8">
          <p className="mb-2 text-sm font-semibold">Historical games</p>
          <ul className="space-y-2">
            {historical.map((game) => (
              <li key={game.id} className="rounded-xl border border-emerald-900/80 bg-court-900/60 px-4 py-3">
                {game.teamName} vs {game.opponent}
              </li>
            ))}
          </ul>
          {historical.length === 0 ? <p className="text-sm text-emerald-100/50">No games in that season.</p> : null}
        </section>
      ) : null}

      {user?.role === "ADMIN" ? (
        <form onSubmit={handleArchive} className="space-y-3 rounded-2xl border border-amber-900 bg-court-900/80 p-5">
          <p className="text-sm font-semibold">Archive the active season</p>
          <p className="text-xs text-emerald-100/50">
            This freezes current teams/games in place and opens an empty season. Re-seed locally to restore the demo.
          </p>
          <input
            className="w-full rounded-lg border border-emerald-800 bg-court-950 px-3 py-2"
            value={name}
            onChange={(e) => setName(e.target.value)}
            aria-label="New season name"
            required
          />
          <input
            className="w-full rounded-lg border border-emerald-800 bg-court-950 px-3 py-2"
            type="number"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            aria-label="New season year"
            required
          />
          <button type="submit" className="rounded-lg bg-amber-400 px-4 py-2 font-semibold text-court-950">
            Archive and start new season
          </button>
        </form>
      ) : null}
    </main>
  );
}
