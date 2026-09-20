"use client";

/**
 * Coach notes: pick a rostered player, write a private observation.
 */

import { FormEvent, useEffect, useState } from "react";
import type {
  CoachNoteView,
  CreateCoachNoteRequest,
  PublicUser,
  RosterPlayer,
  TeamView,
} from "@volleyball-manager/shared-types";
import { AppHeader } from "@/components/AppHeader";
import { api } from "@/lib/api";

/** Team detail payload includes roster. */
type TeamDetail = TeamView & { roster: RosterPlayer[] };

/** Private notes page (COACH/ADMIN). */
export default function NotesPage() {
  const [user, setUser] = useState<PublicUser | null>(null);
  const [players, setPlayers] = useState<RosterPlayer[]>([]);
  const [notes, setNotes] = useState<CoachNoteView[]>([]);
  const [playerId, setPlayerId] = useState("");
  const [content, setContent] = useState("");
  const [error, setError] = useState<string | null>(null);

  /** Loads session, active-season roster, and notes. */
  async function reload(): Promise<void> {
    const me = await api<PublicUser>("/auth/me");
    setUser(me);
    const teams = await api<TeamView[]>("/teams");
    const details = await Promise.all(teams.map((team) => api<TeamDetail>(`/teams/${team.id}`)));
    const roster = details.flatMap((team) => team.roster);
    setPlayers(roster);
    if (!playerId && roster[0]) {
      setPlayerId(roster[0].userId);
    }
    const list = await api<CoachNoteView[]>("/notes");
    setNotes(list);
  }

  useEffect(() => {
    reload().catch((err: unknown) => setError(err instanceof Error ? err.message : "Could not load notes"));
    // Initial load only — playerId is set from the first roster row.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const canWrite = user?.role === "COACH" || user?.role === "ADMIN";

  /** Creates a note for the selected player. */
  async function handleCreate(event: FormEvent): Promise<void> {
    event.preventDefault();
    setError(null);
    const body: CreateCoachNoteRequest = { playerId, content };
    try {
      await api("/notes", { method: "POST", body: JSON.stringify(body) });
      setContent("");
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save note");
    }
  }

  /** Deletes a note the current coach authored (or any, if ADMIN). */
  async function handleDelete(id: string): Promise<void> {
    try {
      await api(`/notes/${id}`, { method: "DELETE" });
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete note");
    }
  }

  if (user && !canWrite) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-10">
        <AppHeader title="Coach notes" />
        <p className="text-red-300">Coach notes are only visible to coaches and admins.</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <AppHeader title="Coach notes" />
      <p className="mb-6 text-sm text-emerald-100/60">Private observations. Players and parents cannot read these.</p>
      {error ? <p className="mb-4 text-red-300">{error}</p> : null}

      {canWrite ? (
        <form onSubmit={handleCreate} className="mb-8 space-y-3 rounded-2xl border border-emerald-900 bg-court-900/80 p-5">
          <label className="block text-sm">
            Player
            <select
              className="mt-1 w-full rounded-lg border border-emerald-800 bg-court-950 px-3 py-2"
              value={playerId}
              onChange={(e) => setPlayerId(e.target.value)}
              required
            >
              {players.map((player) => (
                <option key={player.userId} value={player.userId}>
                  #{player.jerseyNum ?? "—"} {player.firstName} {player.lastName}
                </option>
              ))}
            </select>
          </label>
          <textarea
            className="w-full rounded-lg border border-emerald-800 bg-court-950 px-3 py-2"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            aria-label="Note"
            rows={3}
            required
          />
          <button type="submit" className="rounded-lg bg-court-400 px-4 py-2 font-semibold text-court-950">
            Save note
          </button>
        </form>
      ) : null}

      <ul className="space-y-3">
        {notes.map((note) => (
          <li key={note.id} className="rounded-2xl border border-emerald-900 bg-court-900/80 p-5">
            <p className="text-sm text-emerald-100/60">
              {note.playerName} · {note.coachName} · {note.createdAt}
            </p>
            <p className="mt-2 whitespace-pre-wrap">{note.content}</p>
            {user && (user.role === "ADMIN" || user.id === note.coachId) ? (
              <button type="button" onClick={() => handleDelete(note.id)} className="mt-3 text-sm text-red-300 underline">
                Delete
              </button>
            ) : null}
          </li>
        ))}
      </ul>
    </main>
  );
}
