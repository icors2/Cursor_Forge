"use client";

/**
 * Coach roster module: every active-season team plus jersey/position editors.
 */

import Link from "next/link";
import { useEffect, useState } from "react";
import type { PublicUser, RosterPlayer, RosterPosition, TeamView } from "@volleyball-manager/shared-types";
import { ROSTER_POSITIONS, ROSTER_POSITION_LABELS } from "@volleyball-manager/shared-types";
import { AppHeader } from "@/components/AppHeader";
import { api } from "@/lib/api";

/** Team detail payload used to edit positions. */
type TeamDetail = TeamView & { roster: RosterPlayer[] };

/** First-class roster workspace for COACH/ADMIN. */
export default function RosterPage() {
  const [user, setUser] = useState<PublicUser | null>(null);
  const [teams, setTeams] = useState<TeamDetail[]>([]);
  const [editPosition, setEditPosition] = useState<Record<string, RosterPosition | "">>({});
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  /** Reloads session and every active-season roster. */
  async function reload(): Promise<void> {
    const me = await api<PublicUser>("/auth/me");
    setUser(me);
    if (me.role !== "ADMIN" && me.role !== "COACH") {
      setTeams([]);
      return;
    }
    const list = await api<TeamView[]>("/teams");
    const details = await Promise.all(list.map((team) => api<TeamDetail>(`/teams/${team.id}`)));
    setTeams(details);
  }

  useEffect(() => {
    reload().catch((err: unknown) => setError(err instanceof Error ? err.message : "Could not load roster"));
  }, []);

  const canWrite = user?.role === "ADMIN" || user?.role === "COACH";
  const staff = canWrite;

  /** COACH/ADMIN persist a court position on one roster row. */
  async function handlePosition(teamId: string, player: RosterPlayer): Promise<void> {
    const next = editPosition[player.id] || player.position;
    if (!next) return;
    setError(null);
    try {
      await api(`/teams/${teamId}/roster/${player.id}`, {
        method: "PATCH",
        body: JSON.stringify({ position: next }),
      });
      setNotice(`Set ${player.firstName} to ${ROSTER_POSITION_LABELS[next]}.`);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update position");
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <AppHeader title="Roster" />
      <p className="mb-6 text-sm text-emerald-100/60">
        Promote applicants from Registration, then set jersey and court position here. Unlimited teams — each card is
        one roster.
      </p>
      {user && !staff ? (
        <p className="mb-4 text-sm text-emerald-100/70">
          Coaches set positions. Your team list is on{" "}
          <Link href="/teams" className="text-court-400 hover:underline">
            Teams
          </Link>
          .
        </p>
      ) : null}
      {error ? <p className="mb-4 text-red-300">{error}</p> : null}
      {notice ? <p className="mb-4 text-court-400">{notice}</p> : null}

      {staff
        ? teams.map((team) => (
        <section key={team.id} className="mb-8 rounded-2xl border border-emerald-900 bg-court-900/80 p-5">
          <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-lg font-semibold">{team.name}</h2>
            <Link href={`/teams/${team.id}`} className="text-sm text-court-400 hover:underline">
              Team page
            </Link>
          </div>
          <ul className="space-y-3">
            {team.roster.map((player) => (
              <li key={player.id} className="rounded-xl border border-emerald-900/80 bg-court-950/60 p-4">
                <p className="font-semibold">
                  #{player.jerseyNum ?? "—"} {player.firstName} {player.lastName}
                </p>
                <p className="text-sm text-emerald-100/60">
                  {player.position ? `${player.position} · ${ROSTER_POSITION_LABELS[player.position]}` : "No position set"}
                </p>
                {canWrite ? (
                  <div className="mt-3 flex flex-wrap items-end gap-2">
                    <label className="block text-sm">
                      Position
                      <select
                        className="mt-1 rounded-lg border border-emerald-800 bg-court-950 px-3 py-2"
                        value={editPosition[player.id] ?? player.position ?? ""}
                        onChange={(e) =>
                          setEditPosition((current) => ({
                            ...current,
                            [player.id]: e.target.value as RosterPosition | "",
                          }))
                        }
                      >
                        <option value="">Choose</option>
                        {ROSTER_POSITIONS.map((pos) => (
                          <option key={pos} value={pos}>
                            {pos} · {ROSTER_POSITION_LABELS[pos]}
                          </option>
                        ))}
                      </select>
                    </label>
                    <button
                      type="button"
                      onClick={() => handlePosition(team.id, player)}
                      className="rounded-lg bg-court-400 px-3 py-2 text-sm font-semibold text-court-950"
                    >
                      Save position
                    </button>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
          {team.roster.length === 0 ? (
            <p className="text-sm text-emerald-100/50">
              No players yet.{" "}
              <Link href="/registrations" className="text-court-400 hover:underline">
                Promote from the pool
              </Link>{" "}
              or add someone on the team page.
            </p>
          ) : null}
        </section>
          ))
        : null}

      {staff && teams.length === 0 && !error ? (
        <p className="text-emerald-100/60">
          No teams in the active season.{" "}
          <Link href="/registrations" className="text-court-400 hover:underline">
            Create a team and open registration
          </Link>
          .
        </p>
      ) : null}
    </main>
  );
}
