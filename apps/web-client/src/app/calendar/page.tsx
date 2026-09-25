"use client";

/**
 * Schedule view: subscribe URLs plus COACH/ADMIN ICS import with review/edit.
 */

import { FormEvent, useEffect, useState } from "react";
import type {
  CalendarImportCommitResult,
  CalendarImportEvent,
  GameSummary,
  PublicUser,
  TeamView,
  UpdateGameRequest,
} from "@volleyball-manager/shared-types";
import { AppHeader } from "@/components/AppHeader";
import { api, apiBase } from "@/lib/api";
import { fromDatetimeLocal, toDatetimeLocal, utcLabel } from "@/lib/datetime";

/** Editable preview row before commit. */
interface DraftEvent {
  /** ICS UID. */
  uid: string;
  /** Chosen team. */
  teamId: string;
  /** Opponent. */
  opponent: string;
  /** datetime-local kickoff. */
  kickoffLocal: string;
  /** Original SUMMARY. */
  summary: string;
  /** True when parse could not pick a team or time. */
  unmatched: boolean;
}

/** Calendar + iCal subscribe and import page. */
export default function CalendarPage() {
  const [user, setUser] = useState<PublicUser | null>(null);
  const [games, setGames] = useState<GameSummary[]>([]);
  const [teams, setTeams] = useState<TeamView[]>([]);
  const [url, setUrl] = useState("");
  const [icsText, setIcsText] = useState("");
  const [drafts, setDrafts] = useState<DraftEvent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  /** Reloads session, teams, and games. */
  async function reload(): Promise<void> {
    const [me, nextGames, nextTeams] = await Promise.all([
      api<PublicUser>("/auth/me"),
      api<GameSummary[]>("/games"),
      api<TeamView[]>("/teams"),
    ]);
    setUser(me);
    setGames(nextGames);
    setTeams(nextTeams);
  }

  useEffect(() => {
    reload().catch((err: unknown) => setError(err instanceof Error ? err.message : "Could not load calendar"));
  }, []);

  const canImport = user?.role === "COACH" || user?.role === "ADMIN";

  /** Builds review rows from a remote URL or pasted ICS. */
  async function handlePreview(event: FormEvent): Promise<void> {
    event.preventDefault();
    setError(null);
    setNotice(null);
    setPending(true);
    try {
      const preview = await api<{ events: CalendarImportEvent[] }>("/calendar/import/preview", {
        method: "POST",
        body: JSON.stringify({
          ...(url.trim() ? { url: url.trim() } : {}),
          ...(icsText.trim() ? { icsText } : {}),
        }),
      });
      setDrafts(
        preview.events.map((row) => ({
          uid: row.uid,
          teamId: row.suggestedTeamId ?? teams[0]?.id ?? "",
          opponent: row.suggestedOpponent,
          kickoffLocal: row.scheduledAt ? toDatetimeLocal(row.scheduledAt) : "",
          summary: row.summary,
          unmatched: row.unmatched,
        })),
      );
      setNotice(`Previewed ${preview.events.length} event(s). Review team mapping, then import.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not preview calendar");
    } finally {
      setPending(false);
    }
  }

  /** Commits reviewed rows as Game records. */
  async function handleImport(): Promise<void> {
    setError(null);
    setNotice(null);
    setPending(true);
    try {
      const events = drafts
        .filter((row) => row.teamId && row.opponent && row.kickoffLocal)
        .map((row) => ({
          uid: row.uid,
          teamId: row.teamId,
          opponent: row.opponent,
          scheduledAt: fromDatetimeLocal(row.kickoffLocal),
        }));
      const result = await api<CalendarImportCommitResult>("/calendar/import/commit", {
        method: "POST",
        body: JSON.stringify({
          ...(url.trim() ? { url: url.trim() } : {}),
          events,
        }),
      });
      setNotice(`Imported ${result.games.length} game(s). ${result.skipped} skipped.`);
      setDrafts([]);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not import calendar");
    } finally {
      setPending(false);
    }
  }

  /** PATCH an already-saved game when mapping was wrong. */
  async function handleEditGame(game: GameSummary, teamId: string, opponent: string, kickoffLocal: string): Promise<void> {
    setError(null);
    const body: UpdateGameRequest = {
      teamId,
      opponent,
      scheduledAt: fromDatetimeLocal(kickoffLocal),
    };
    try {
      await api(`/games/${game.id}`, { method: "PATCH", body: JSON.stringify(body) });
      await reload();
      setNotice("Game updated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update game");
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <AppHeader title="Calendar" />
      <p className="mb-6 text-sm text-emerald-100/60">
        Kickoffs are stored in UTC. Subscribe with a per-team .ics link, or import a multi-team feed and fix
        Varsity / JV / Middle School mapping before save.
      </p>
      {error ? <p className="mb-4 text-red-300">{error}</p> : null}
      {notice ? <p className="mb-4 text-court-400">{notice}</p> : null}

      {canImport ? (
        <form onSubmit={handlePreview} className="mb-8 space-y-3 rounded-2xl border border-emerald-900 bg-court-900/80 p-5">
          <p className="text-sm font-semibold">Import a club ICS (Varsity, JV, Middle School)</p>
          <label className="block text-sm">
            Calendar URL (https)
            <input
              className="mt-1 w-full rounded-lg border border-emerald-800 bg-court-950 px-3 py-2"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com/club.ics"
            />
          </label>
          <label className="block text-sm">
            Or paste ICS text
            <textarea
              className="mt-1 w-full rounded-lg border border-emerald-800 bg-court-950 px-3 py-2 font-mono text-xs"
              rows={5}
              value={icsText}
              onChange={(e) => setIcsText(e.target.value)}
            />
          </label>
          <button
            type="submit"
            disabled={pending}
            className="rounded-lg bg-court-400 px-4 py-2 font-semibold text-court-950 disabled:opacity-50"
          >
            Preview
          </button>
        </form>
      ) : null}

      {drafts.length > 0 ? (
        <section className="mb-8 space-y-3">
          <p className="text-sm font-semibold">Review before import</p>
          {drafts.map((row, index) => (
            <div key={`${row.uid}-${index}`} className="rounded-2xl border border-emerald-900 bg-court-900/80 p-5">
              <p className="text-xs text-emerald-100/50">{row.summary}</p>
              {row.unmatched ? <p className="text-sm text-amber-300">Needs a team or kickoff</p> : <p className="text-sm text-court-400">Auto-matched</p>}
              <label className="mt-2 block text-sm">
                Team
                <select
                  className="mt-1 w-full rounded-lg border border-emerald-800 bg-court-950 px-3 py-2"
                  value={row.teamId}
                  onChange={(e) => {
                    const teamId = e.target.value;
                    setDrafts((current) => current.map((item, i) => (i === index ? { ...item, teamId } : item)));
                  }}
                >
                  <option value="">Select team</option>
                  {teams.map((team) => (
                    <option key={team.id} value={team.id}>
                      {team.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="mt-2 block text-sm">
                Opponent
                <input
                  className="mt-1 w-full rounded-lg border border-emerald-800 bg-court-950 px-3 py-2"
                  value={row.opponent}
                  onChange={(e) => {
                    const opponent = e.target.value;
                    setDrafts((current) => current.map((item, i) => (i === index ? { ...item, opponent } : item)));
                  }}
                />
              </label>
              <label className="mt-2 block text-sm">
                Kickoff
                <input
                  type="datetime-local"
                  className="mt-1 w-full rounded-lg border border-emerald-800 bg-court-950 px-3 py-2"
                  value={row.kickoffLocal}
                  onChange={(e) => {
                    const kickoffLocal = e.target.value;
                    setDrafts((current) => current.map((item, i) => (i === index ? { ...item, kickoffLocal } : item)));
                  }}
                />
              </label>
            </div>
          ))}
          <button
            type="button"
            disabled={pending}
            onClick={() => handleImport()}
            className="rounded-lg bg-court-400 px-4 py-2 font-semibold text-court-950 disabled:opacity-50"
          >
            Import games
          </button>
        </section>
      ) : null}

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
            {canImport ? (
              <form
                className="mt-3 grid gap-2 sm:grid-cols-3"
                onSubmit={(event) => {
                  event.preventDefault();
                  const form = event.currentTarget;
                  const teamId = (form.elements.namedItem("teamId") as HTMLSelectElement).value;
                  const opponent = (form.elements.namedItem("opponent") as HTMLInputElement).value;
                  const kickoff = (form.elements.namedItem("kickoff") as HTMLInputElement).value;
                  void handleEditGame(game, teamId, opponent, kickoff);
                }}
              >
                <label className="text-sm">
                  Team
                  <select
                    name="teamId"
                    defaultValue={game.teamId}
                    className="mt-1 w-full rounded-lg border border-emerald-800 bg-court-950 px-3 py-2"
                  >
                    {teams.map((team) => (
                      <option key={team.id} value={team.id}>
                        {team.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-sm">
                  Opponent
                  <input
                    name="opponent"
                    defaultValue={game.opponent}
                    className="mt-1 w-full rounded-lg border border-emerald-800 bg-court-950 px-3 py-2"
                  />
                </label>
                <label className="text-sm">
                  Kickoff
                  <input
                    name="kickoff"
                    type="datetime-local"
                    defaultValue={toDatetimeLocal(game.scheduledAt)}
                    className="mt-1 w-full rounded-lg border border-emerald-800 bg-court-950 px-3 py-2"
                  />
                </label>
                <button type="submit" className="rounded-lg border border-emerald-800 px-3 py-2 text-sm">
                  Save edit
                </button>
              </form>
            ) : null}
          </li>
        ))}
      </ul>
      {games.length === 0 && !error ? <p className="text-emerald-100/60">No games in the active season.</p> : null}
    </main>
  );
}
