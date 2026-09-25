"use client";

/**
 * Team roster. ADMIN/COACH add an existing PLAYER or create a new unpaid one.
 */

import { useParams } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import type {
  CreateRosterRequest,
  CreateRosterResult,
  GameSummary,
  PublicUser,
  RosterPlayer,
  RosterPosition,
  TeamView,
} from "@volleyball-manager/shared-types";
import { ROSTER_POSITIONS, ROSTER_POSITION_LABELS } from "@volleyball-manager/shared-types";
import { AppHeader } from "@/components/AppHeader";
import { api } from "@/lib/api";
import { utcLabel } from "@/lib/datetime";

/** Team detail payload. */
type TeamDetail = TeamView & { roster: RosterPlayer[] };

/** Roster page for one team. */
export default function TeamDetailPage() {
  const params = useParams<{ teamId: string }>();
  const teamId = params.teamId;
  const [user, setUser] = useState<PublicUser | null>(null);
  const [team, setTeam] = useState<TeamDetail | null>(null);
  const [players, setPlayers] = useState<PublicUser[]>([]);
  const [games, setGames] = useState<GameSummary[]>([]);
  const [userId, setUserId] = useState("");
  const [manual, setManual] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [jerseyNum, setJerseyNum] = useState(9);
  const [position, setPosition] = useState<RosterPosition | "">("");
  const [editPosition, setEditPosition] = useState<Record<string, RosterPosition | "">>({});
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  /** Reloads team, players, and this team's games. */
  async function reload(): Promise<void> {
    const me = await api<PublicUser>("/auth/me");
    setUser(me);
    const detail = await api<TeamDetail>(`/teams/${teamId}`);
    setTeam(detail);
    const allGames = await api<GameSummary[]>("/games");
    setGames(allGames.filter((game) => game.teamId === teamId));
    if (me.role === "ADMIN" || me.role === "COACH") {
      const list = await api<PublicUser[]>("/users?role=PLAYER");
      setPlayers(list);
      if (!userId && list[0]) {
        setUserId(list[0].id);
      }
    }
  }

  useEffect(() => {
    reload().catch((err: unknown) => setError(err instanceof Error ? err.message : "Could not load team"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamId]);

  const canWrite = user?.role === "ADMIN" || user?.role === "COACH";

  /** Adds a player from the dropdown or a newly typed identity. */
  async function handleAdd(event: FormEvent): Promise<void> {
    event.preventDefault();
    setError(null);
    setNotice(null);
    const body: CreateRosterRequest = manual
      ? { firstName, lastName, email, jerseyNum, position: position || undefined }
      : { userId, jerseyNum, position: position || undefined };
    try {
      const created = await api<CreateRosterResult>(`/teams/${teamId}/roster`, {
        method: "POST",
        body: JSON.stringify(body),
      });
      setNotice(
        created.temporaryPassword
          ? `Player added. Temporary password: ${created.temporaryPassword}`
          : "Player added.",
      );
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add player");
    }
  }

  /** COACH/ADMIN save a court position on an existing roster row. */
  async function handlePosition(player: RosterPlayer): Promise<void> {
    const next = editPosition[player.id];
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
      <AppHeader title={team ? team.name : "Team"} />
      {error ? <p className="mb-4 text-red-300">{error}</p> : null}
      {notice ? <p className="mb-4 text-court-400">{notice}</p> : null}

      <section className="mb-8">
        <p className="mb-3 text-sm font-semibold">Scheduled games</p>
        <ul className="space-y-2">
          {games.map((game) => (
            <li key={game.id} className="rounded-xl border border-emerald-900/80 bg-court-900/60 px-4 py-3">
              vs {game.opponent} · {utcLabel(game.scheduledAt)}
            </li>
          ))}
        </ul>
        {games.length === 0 ? <p className="text-sm text-emerald-100/50">No games scheduled for this team.</p> : null}
      </section>

      <ul className="mb-8 space-y-3">
        {team?.roster.map((player) => (
          <li key={player.id} className="rounded-2xl border border-emerald-900 bg-court-900/80 p-5">
            <p className="text-lg font-semibold">
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
                      setEditPosition((current) => ({ ...current, [player.id]: e.target.value as RosterPosition | "" }))
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
                  onClick={() => handlePosition(player)}
                  className="rounded-lg border border-emerald-800 px-3 py-2 text-sm hover:border-court-400"
                >
                  Save position
                </button>
              </div>
            ) : null}
          </li>
        ))}
      </ul>

      {canWrite ? (
        <form onSubmit={handleAdd} className="space-y-3 rounded-2xl border border-emerald-900 bg-court-900/80 p-5">
          <p className="text-sm font-semibold">Add player</p>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={manual} onChange={(e) => setManual(e.target.checked)} />
            Add a new player manually
          </label>
          {manual ? (
            <>
              <label className="block text-sm">
                First name
                <input
                  className="mt-1 w-full rounded-lg border border-emerald-800 bg-court-950 px-3 py-2"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                />
              </label>
              <label className="block text-sm">
                Last name
                <input
                  className="mt-1 w-full rounded-lg border border-emerald-800 bg-court-950 px-3 py-2"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                />
              </label>
              <label className="block text-sm">
                Email
                <input
                  type="email"
                  className="mt-1 w-full rounded-lg border border-emerald-800 bg-court-950 px-3 py-2"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </label>
            </>
          ) : (
            <label className="block text-sm">
              Player
              <select
                className="mt-1 w-full rounded-lg border border-emerald-800 bg-court-950 px-3 py-2"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                required
              >
                {players.map((player) => (
                  <option key={player.id} value={player.id}>
                    {player.firstName} {player.lastName}
                    {player.isDuesPaid ? "" : " (dues unpaid)"}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label className="block text-sm">
            Jersey
            <input
              className="mt-1 w-full rounded-lg border border-emerald-800 bg-court-950 px-3 py-2"
              type="number"
              min={0}
              max={99}
              value={jerseyNum}
              onChange={(e) => setJerseyNum(Number(e.target.value))}
            />
          </label>
          <label className="block text-sm">
            Position
            <select
              className="mt-1 w-full rounded-lg border border-emerald-800 bg-court-950 px-3 py-2"
              value={position}
              onChange={(e) => setPosition(e.target.value as RosterPosition | "")}
            >
              <option value="">None yet</option>
              {ROSTER_POSITIONS.map((pos) => (
                <option key={pos} value={pos}>
                  {pos} · {ROSTER_POSITION_LABELS[pos]}
                </option>
              ))}
            </select>
          </label>
          <button type="submit" className="rounded-lg bg-court-400 px-4 py-2 font-semibold text-court-950">
            Add to roster
          </button>
        </form>
      ) : null}
    </main>
  );
}
