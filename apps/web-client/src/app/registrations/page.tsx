"use client";

/**
 * Team registration board. Staff open windows; parents/players apply.
 */

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import type { PublicUser, TeamRegistrationView, TeamView } from "@volleyball-manager/shared-types";
import { AppHeader } from "@/components/AppHeader";
import { api } from "@/lib/api";

/** List + open form for team apply windows. */
export default function RegistrationsPage() {
  const [user, setUser] = useState<PublicUser | null>(null);
  const [items, setItems] = useState<TeamRegistrationView[]>([]);
  const [teams, setTeams] = useState<TeamView[]>([]);
  const [teamId, setTeamId] = useState("");
  const [newTeamName, setNewTeamName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  /** Reloads session, windows, and active-season teams. */
  async function reload(): Promise<void> {
    const me = await api<PublicUser>("/auth/me");
    setUser(me);
    const list = await api<TeamRegistrationView[]>("/registrations");
    setItems(list);
    if (me.role === "ADMIN" || me.role === "COACH") {
      const nextTeams = await api<TeamView[]>("/teams");
      setTeams(nextTeams);
      if (!teamId && nextTeams[0]) {
        setTeamId(nextTeams[0].id);
      }
    }
  }

  useEffect(() => {
    reload().catch((err: unknown) => setError(err instanceof Error ? err.message : "Could not load registrations"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const staff = user?.role === "ADMIN" || user?.role === "COACH";

  /** COACH/ADMIN open (or reopen) a team window. */
  async function handleOpen(event: FormEvent): Promise<void> {
    event.preventDefault();
    setError(null);
    setNotice(null);
    try {
      await api("/registrations", { method: "POST", body: JSON.stringify({ teamId }) });
      setNotice("Registration is open.");
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not open registration");
    }
  }

  /** COACH/ADMIN create an unlimited new team and immediately open apply. */
  async function handleCreateAndOpen(event: FormEvent): Promise<void> {
    event.preventDefault();
    setError(null);
    setNotice(null);
    try {
      const team = await api<TeamView>("/teams", {
        method: "POST",
        body: JSON.stringify({ name: newTeamName.trim() }),
      });
      await api("/registrations", { method: "POST", body: JSON.stringify({ teamId: team.id }) });
      setNotice(`${team.name} is open for applications.`);
      setNewTeamName("");
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create team");
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <AppHeader title={staff ? "Team registration" : "Apply to a team"} />
      <p className="mb-6 text-sm text-emerald-100/60">
        {staff
          ? "Create a team (unlimited) or open an existing one. Parents and players apply; you promote the pool onto Roster."
          : "Pick a team the coach opened. One account applies once per team."}
      </p>
      {error ? <p className="mb-4 text-red-300">{error}</p> : null}
      {notice ? <p className="mb-4 text-court-400">{notice}</p> : null}

      {staff ? (
        <div className="mb-8 space-y-4">
          <form onSubmit={handleCreateAndOpen} className="space-y-3 rounded-2xl border border-emerald-900 bg-court-900/80 p-5">
            <p className="text-sm font-semibold">Create team and open registration</p>
            <label className="block text-sm">
              New team name
              <input
                className="mt-1 w-full rounded-lg border border-emerald-800 bg-court-950 px-3 py-2"
                value={newTeamName}
                onChange={(e) => setNewTeamName(e.target.value)}
                minLength={2}
                maxLength={80}
                required
              />
            </label>
            <button type="submit" className="rounded-lg bg-court-400 px-4 py-2 font-semibold text-court-950">
              Create and open
            </button>
          </form>
          <form onSubmit={handleOpen} className="space-y-3 rounded-2xl border border-emerald-900 bg-court-900/80 p-5">
            <p className="text-sm font-semibold">Open an existing team</p>
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
            <button type="submit" className="rounded-lg border border-emerald-800 px-4 py-2 font-semibold hover:border-court-400">
              Open for applications
            </button>
          </form>
        </div>
      ) : null}

      <ul className="space-y-3">
        {items.map((row) => (
          <li key={row.id}>
            <Link
              href={`/registrations/${row.id}`}
              className="block rounded-2xl border border-emerald-900 bg-court-900/80 p-5 hover:border-court-400"
            >
              <p className="text-lg font-semibold">{row.teamName}</p>
              <p className="text-sm text-emerald-100/60">
                {row.seasonName} · {row.isOpen ? "Open" : "Closed"}
                {staff ? ` · ${row.applicationCount} in pool` : ""}
              </p>
            </Link>
          </li>
        ))}
      </ul>
      {items.length === 0 && !error ? (
        <p className="text-emerald-100/60">No open team registrations right now.</p>
      ) : null}
    </main>
  );
}
