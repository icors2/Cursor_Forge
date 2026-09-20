"use client";

/**
 * Team roster. ADMIN/COACH can add a dues-paid PLAYER.
 */

import { useParams } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import type { CreateRosterRequest, PublicUser, RosterPlayer, TeamView } from "@volleyball-manager/shared-types";
import { AppHeader } from "@/components/AppHeader";
import { api } from "@/lib/api";

/** Team detail payload. */
type TeamDetail = TeamView & { roster: RosterPlayer[] };

/** Roster page for one team. */
export default function TeamDetailPage() {
  const params = useParams<{ teamId: string }>();
  const teamId = params.teamId;
  const [user, setUser] = useState<PublicUser | null>(null);
  const [team, setTeam] = useState<TeamDetail | null>(null);
  const [userId, setUserId] = useState("20202020-2020-4202-8202-202020202020");
  const [jerseyNum, setJerseyNum] = useState(9);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  /** Reloads team + session. */
  async function reload(): Promise<void> {
    const me = await api<PublicUser>("/auth/me");
    setUser(me);
    const detail = await api<TeamDetail>(`/teams/${teamId}`);
    setTeam(detail);
  }

  useEffect(() => {
    reload().catch((err: unknown) => setError(err instanceof Error ? err.message : "Could not load team"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamId]);

  const canWrite = user?.role === "ADMIN" || user?.role === "COACH";

  /** Adds a player; unpaid dues are rejected by the API. */
  async function handleAdd(event: FormEvent): Promise<void> {
    event.preventDefault();
    setError(null);
    setNotice(null);
    const body: CreateRosterRequest = { userId, jerseyNum };
    try {
      await api(`/teams/${teamId}/roster`, { method: "POST", body: JSON.stringify(body) });
      setNotice("Player added.");
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add player");
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <AppHeader title={team ? team.name : "Team"} />
      {error ? <p className="mb-4 text-red-300">{error}</p> : null}
      {notice ? <p className="mb-4 text-court-400">{notice}</p> : null}

      <ul className="mb-8 space-y-3">
        {team?.roster.map((player) => (
          <li key={player.id} className="rounded-2xl border border-emerald-900 bg-court-900/80 p-5">
            <p className="text-lg font-semibold">
              #{player.jerseyNum ?? "—"} {player.firstName} {player.lastName}
            </p>
          </li>
        ))}
      </ul>

      {canWrite ? (
        <form onSubmit={handleAdd} className="space-y-3 rounded-2xl border border-emerald-900 bg-court-900/80 p-5">
          <p className="text-sm font-semibold">Add player (must have dues paid)</p>
          <input
            className="w-full rounded-lg border border-emerald-800 bg-court-950 px-3 py-2"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            aria-label="Player user id"
            required
          />
          <input
            className="w-full rounded-lg border border-emerald-800 bg-court-950 px-3 py-2"
            type="number"
            min={0}
            max={99}
            value={jerseyNum}
            onChange={(e) => setJerseyNum(Number(e.target.value))}
            aria-label="Jersey"
          />
          <button type="submit" className="rounded-lg bg-court-400 px-4 py-2 font-semibold text-court-950">
            Add to roster
          </button>
        </form>
      ) : null}
    </main>
  );
}
