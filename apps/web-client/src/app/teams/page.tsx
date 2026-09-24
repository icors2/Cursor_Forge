"use client";

/**
 * Active-season teams. ADMIN/COACH can create a team and schedule a game.
 */

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import type { CreateGameRequest, CreateTeamRequest, GameSummary, PublicUser, TeamView } from "@volleyball-manager/shared-types";
import { AppHeader } from "@/components/AppHeader";
import { api } from "@/lib/api";
import { fromDatetimeLocal, toDatetimeLocal, utcLabel } from "@/lib/datetime";

/** Teams + game-setup page. */
export default function TeamsPage() {
  const [user, setUser] = useState<PublicUser | null>(null);
  const [teams, setTeams] = useState<TeamView[]>([]);
  const [games, setGames] = useState<GameSummary[]>([]);
  const [name, setName] = useState("JV Forge");
  const [teamId, setTeamId] = useState("");
  const [opponent, setOpponent] = useState("Northridge");
  const [scheduledAt, setScheduledAt] = useState(toDatetimeLocal("2026-10-04T17:00:00.000Z"));
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  /** Reloads session, teams, and scheduled games. */
  async function reload(): Promise<void> {
    const [me, list, nextGames] = await Promise.all([
      api<PublicUser>("/auth/me"),
      api<TeamView[]>("/teams"),
      api<GameSummary[]>("/games"),
    ]);
    setUser(me);
    setTeams(list);
    setGames(nextGames);
    if (!teamId && list[0]) {
      setTeamId(list[0].id);
    }
  }

  useEffect(() => {
    reload().catch((err: unknown) => setError(err instanceof Error ? err.message : "Could not load teams"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const canWrite = user?.role === "ADMIN" || user?.role === "COACH";

  /** ADMIN/COACH create a team on the active season. */
  async function handleCreateTeam(event: FormEvent): Promise<void> {
    event.preventDefault();
    setError(null);
    const body: CreateTeamRequest = { name };
    try {
      await api("/teams", { method: "POST", body: JSON.stringify(body) });
      setNotice("Team created.");
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create team");
    }
  }

  /** COACH/ADMIN schedule a game (local datetime → UTC). */
  async function handleCreateGame(event: FormEvent): Promise<void> {
    event.preventDefault();
    setError(null);
    const body: CreateGameRequest = { teamId, opponent, scheduledAt: fromDatetimeLocal(scheduledAt) };
    try {
      const created = await api<GameSummary>("/games", { method: "POST", body: JSON.stringify(body) });
      setNotice(`Scheduled vs ${created.opponent}.`);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not schedule game");
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <AppHeader title="Teams" />
      {error ? <p className="mb-4 text-red-300">{error}</p> : null}
      {notice ? <p className="mb-4 text-court-400">{notice}</p> : null}

      <ul className="mb-8 space-y-3">
        {teams.map((team) => (
          <li key={team.id}>
            <Link
              href={`/teams/${team.id}`}
              className="block rounded-2xl border border-emerald-900 bg-court-900/80 p-5 hover:border-court-400"
            >
              <p className="text-lg font-semibold">{team.name}</p>
              <p className="text-sm text-emerald-100/60">
                {team.seasonName} · {team.rosterCount} on roster
              </p>
            </Link>
          </li>
        ))}
      </ul>

      <section className="mb-8">
        <p className="mb-3 text-sm font-semibold">Scheduled games</p>
        <ul className="space-y-2">
          {games.map((game) => (
            <li key={game.id} className="rounded-xl border border-emerald-900/80 bg-court-900/60 px-4 py-3">
              <p className="font-medium">
                {game.teamName} vs {game.opponent}
              </p>
              <p className="text-sm text-emerald-100/60">{utcLabel(game.scheduledAt)}</p>
            </li>
          ))}
        </ul>
        {games.length === 0 ? <p className="text-sm text-emerald-100/50">No games scheduled yet.</p> : null}
      </section>

      {canWrite ? (
        <div className="space-y-6">
          <form onSubmit={handleCreateTeam} className="space-y-3 rounded-2xl border border-emerald-900 bg-court-900/80 p-5">
            <p className="text-sm font-semibold">Create team (active season)</p>
            <label className="block text-sm">
              Team name
              <input
                className="mt-1 w-full rounded-lg border border-emerald-800 bg-court-950 px-3 py-2"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </label>
            <button type="submit" className="rounded-lg bg-court-400 px-4 py-2 font-semibold text-court-950">
              Create team
            </button>
          </form>
          <form onSubmit={handleCreateGame} className="space-y-3 rounded-2xl border border-emerald-900 bg-court-900/80 p-5">
            <p className="text-sm font-semibold">Schedule a game</p>
            <label className="block text-sm">
              Team
              <select
                className="mt-1 w-full rounded-lg border border-emerald-800 bg-court-950 px-3 py-2"
                value={teamId}
                onChange={(e) => setTeamId(e.target.value)}
                required
              >
                {teams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              Opponent
              <input
                className="mt-1 w-full rounded-lg border border-emerald-800 bg-court-950 px-3 py-2"
                value={opponent}
                onChange={(e) => setOpponent(e.target.value)}
                required
              />
            </label>
            <label className="block text-sm">
              Kickoff
              <input
                type="datetime-local"
                className="mt-1 w-full rounded-lg border border-emerald-800 bg-court-950 px-3 py-2"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                required
              />
            </label>
            <button type="submit" className="rounded-lg bg-court-400 px-4 py-2 font-semibold text-court-950">
              Schedule game
            </button>
          </form>
        </div>
      ) : null}
    </main>
  );
}
