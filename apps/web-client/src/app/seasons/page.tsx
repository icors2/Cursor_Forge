"use client";

/**
 * Season list + ADMIN archiveSeason. History opens a printable rollup.
 */

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import type { ArchiveSeasonRequest, ArchiveSeasonResult, PublicUser, SeasonView } from "@volleyball-manager/shared-types";
import { AppHeader } from "@/components/AppHeader";
import { api } from "@/lib/api";

/** Season archive + history links. */
export default function SeasonsPage() {
  const [user, setUser] = useState<PublicUser | null>(null);
  const [seasons, setSeasons] = useState<SeasonView[]>([]);
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
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not archive season");
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <AppHeader title="Seasons" />
      <p className="mb-6 text-sm text-emerald-100/60">
        Open a season history for game results and player totals. Print keeps a paper record.
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
            <div className="mt-2 flex flex-wrap gap-3 text-sm">
              {season.isActive ? (
                <Link href="/live" className="text-court-400 underline">
                  Open active games
                </Link>
              ) : null}
              <Link href={`/seasons/${season.id}/history`} className="text-court-400 underline">
                Open history
              </Link>
            </div>
          </li>
        ))}
      </ul>

      {user?.role === "ADMIN" ? (
        <form onSubmit={handleArchive} className="space-y-3 rounded-2xl border border-amber-900 bg-court-900/80 p-5">
          <p className="text-sm font-semibold">Archive the active season</p>
          <p className="text-xs text-emerald-100/50">
            This freezes current teams/games in place and opens an empty season. Re-seed locally to restore the demo.
          </p>
          <label className="block text-sm">
            New season name
            <input
              className="mt-1 w-full rounded-lg border border-emerald-800 bg-court-950 px-3 py-2"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </label>
          <label className="block text-sm">
            New season year
            <input
              className="mt-1 w-full rounded-lg border border-emerald-800 bg-court-950 px-3 py-2"
              type="number"
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              required
            />
          </label>
          <button type="submit" className="rounded-lg bg-amber-400 px-4 py-2 font-semibold text-court-950">
            Archive and start new season
          </button>
        </form>
      ) : null}
    </main>
  );
}
