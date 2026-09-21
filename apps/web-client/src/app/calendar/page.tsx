"use client";

/**
 * Schedule view: active-season games plus a public iCal subscribe URL (UTC kickoffs).
 */

import { useEffect, useState } from "react";
import type { GameSummary, TeamView } from "@volleyball-manager/shared-types";
import { AppHeader } from "@/components/AppHeader";
import { api, apiBase } from "@/lib/api";

/** Formats a UTC instant without converting to a local zone. */
function utcLabel(iso: string): string {
  return iso.replace("T", " ").replace(".000Z", "Z");
}

/** Calendar + iCal subscribe page. */
export default function CalendarPage() {
  const [games, setGames] = useState<GameSummary[]>([]);
  const [teams, setTeams] = useState<TeamView[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([api<GameSummary[]>("/games"), api<TeamView[]>("/teams")])
      .then(([nextGames, nextTeams]) => {
        setGames(nextGames);
        setTeams(nextTeams);
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Could not load calendar"));
  }, []);

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <AppHeader title="Calendar" />
      <p className="mb-6 text-sm text-emerald-100/60">
        Kickoffs are stored and shown in UTC. Subscribe in Google Calendar with the .ics link — times use
        YYYYMMDDThhmmssZ.
      </p>
      {error ? <p className="mb-4 text-red-300">{error}</p> : null}

      {teams.map((team) => {
        const feed = `${apiBase()}/calendar/teams/${team.id}/feed.ics`;
        return (
          <section key={team.id} className="mb-6 rounded-2xl border border-emerald-900 bg-court-900/80 p-5">
            <p className="text-lg font-semibold">{team.name}</p>
            <p className="text-sm text-emerald-100/60">{team.seasonName}</p>
            <a href={feed} className="mt-2 inline-block text-sm text-court-400 underline">
              Subscribe (.ics)
            </a>
            <p className="mt-1 break-all text-xs text-emerald-100/40">{feed}</p>
          </section>
        );
      })}

      <ul className="space-y-3">
        {games.map((game) => (
          <li key={game.id} className="rounded-2xl border border-emerald-900 bg-court-900/80 p-5">
            <p className="text-lg font-semibold">
              {game.teamName} vs {game.opponent}
            </p>
            <p className="text-sm text-emerald-100/60">{utcLabel(game.scheduledAt)}</p>
          </li>
        ))}
      </ul>
      {games.length === 0 && !error ? <p className="text-emerald-100/60">No games in the active season.</p> : null}
    </main>
  );
}
