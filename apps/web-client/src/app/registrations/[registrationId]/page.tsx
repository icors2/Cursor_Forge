"use client";

/**
 * One team window: applicants submit; staff promote or decline the pool.
 */

import Link from "next/link";
import { useParams } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import type {
  PublicUser,
  RosterPosition,
  TeamApplicationView,
  TeamRegistrationView,
} from "@volleyball-manager/shared-types";
import { ROSTER_POSITIONS, ROSTER_POSITION_LABELS } from "@volleyball-manager/shared-types";
import { AppHeader } from "@/components/AppHeader";
import { api } from "@/lib/api";

/** Registration detail payload. */
type RegistrationDetail = TeamRegistrationView & { applications: TeamApplicationView[] };

/** Pool + apply page for one team window. */
export default function RegistrationDetailPage() {
  const params = useParams<{ registrationId: string }>();
  const registrationId = params.registrationId;
  const [user, setUser] = useState<PublicUser | null>(null);
  const [detail, setDetail] = useState<RegistrationDetail | null>(null);
  const [playerFirstName, setPlayerFirstName] = useState("");
  const [playerLastName, setPlayerLastName] = useState("");
  const [playerEmail, setPlayerEmail] = useState("");
  const [preferredPosition, setPreferredPosition] = useState<RosterPosition | "">("");
  const [note, setNote] = useState("");
  const [jerseyByApp, setJerseyByApp] = useState<Record<string, number>>({});
  const [positionByApp, setPositionByApp] = useState<Record<string, RosterPosition | "">>({});
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  /** Reloads session and this window. */
  async function reload(): Promise<void> {
    const me = await api<PublicUser>("/auth/me");
    setUser(me);
    const next = await api<RegistrationDetail>(`/registrations/${registrationId}`);
    setDetail(next);
    if (!playerFirstName) setPlayerFirstName(me.firstName);
    if (!playerLastName) setPlayerLastName(me.lastName);
    if (!playerEmail && me.role === "PLAYER") setPlayerEmail(me.email);
  }

  useEffect(() => {
    reload().catch((err: unknown) => setError(err instanceof Error ? err.message : "Could not load registration"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [registrationId]);

  const staff = user?.role === "ADMIN" || user?.role === "COACH";
  const canApply =
    (user?.role === "PARENT" || user?.role === "PLAYER") &&
    detail?.isOpen &&
    !detail.applications.some((row) => row.applicantId === user.id);

  /** PARENT/PLAYER submit one application. */
  async function handleApply(event: FormEvent): Promise<void> {
    event.preventDefault();
    setError(null);
    setNotice(null);
    try {
      await api(`/registrations/${registrationId}/applications`, {
        method: "POST",
        body: JSON.stringify({
          playerFirstName,
          playerLastName,
          playerEmail: playerEmail || undefined,
          preferredPosition: preferredPosition || undefined,
          note: note || undefined,
        }),
      });
      setNotice("Application sent. The coach will review the pool.");
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not apply");
    }
  }

  /** Close or reopen the window. */
  async function handleToggle(): Promise<void> {
    if (!detail) return;
    setError(null);
    try {
      await api(`/registrations/${registrationId}`, {
        method: "PATCH",
        body: JSON.stringify({ isOpen: !detail.isOpen }),
      });
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update registration");
    }
  }

  /** Promote a pending application onto the roster. */
  async function handleAccept(app: TeamApplicationView): Promise<void> {
    setError(null);
    setNotice(null);
    try {
      const result = await api<{ roster: { temporaryPassword?: string } }>(
        `/registrations/${registrationId}/applications/${app.id}/accept`,
        {
          method: "POST",
          body: JSON.stringify({
            jerseyNum: jerseyByApp[app.id],
            position: positionByApp[app.id] || app.preferredPosition || undefined,
          }),
        },
      );
      setNotice(
        result.roster.temporaryPassword
          ? `Promoted to roster. Temporary password: ${result.roster.temporaryPassword}`
          : "Promoted to roster.",
      );
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not accept");
    }
  }

  /** Decline a pending application. */
  async function handleDecline(app: TeamApplicationView): Promise<void> {
    setError(null);
    try {
      await api(`/registrations/${registrationId}/applications/${app.id}/decline`, { method: "POST" });
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not decline");
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <AppHeader title={detail ? `${detail.teamName} registration` : "Registration"} />
      {error ? <p className="mb-4 text-red-300">{error}</p> : null}
      {notice ? <p className="mb-4 text-court-400">{notice}</p> : null}
      {detail ? (
        <p className="mb-6 text-sm text-emerald-100/60">
          {detail.seasonName} · {detail.isOpen ? "Open for applications" : "Closed"}
        </p>
      ) : null}

      {staff && detail ? (
        <section className="mb-6 rounded-2xl border border-emerald-900 bg-court-900/80 p-5">
          <p className="text-sm font-semibold">Coach setup</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-emerald-100/70">
            <li>{detail.isOpen ? "Registration is open" : "Registration is closed"}</li>
            <li>
              {detail.applicationCount} in the pool — promote below, then set positions on{" "}
              <Link href="/roster" className="text-court-400 hover:underline">
                Roster
              </Link>
            </li>
            <li>
              Schedule and live stats live on{" "}
              <Link href="/teams" className="text-court-400 hover:underline">
                Teams
              </Link>{" "}
              and{" "}
              <Link href="/coach" className="text-court-400 hover:underline">
                Stat Tracking
              </Link>
              .
            </li>
          </ul>
          <button
            type="button"
            onClick={handleToggle}
            className="mt-4 rounded-lg border border-emerald-800 px-3 py-1.5 text-sm hover:border-court-400"
          >
            {detail.isOpen ? "Close registration" : "Reopen registration"}
          </button>
        </section>
      ) : null}

      {canApply ? (
        <form onSubmit={handleApply} className="mb-8 space-y-3 rounded-2xl border border-emerald-900 bg-court-900/80 p-5">
          <p className="text-sm font-semibold">Apply</p>
          <label className="block text-sm">
            Player first name
            <input
              className="mt-1 w-full rounded-lg border border-emerald-800 bg-court-950 px-3 py-2"
              value={playerFirstName}
              onChange={(e) => setPlayerFirstName(e.target.value)}
              required
            />
          </label>
          <label className="block text-sm">
            Player last name
            <input
              className="mt-1 w-full rounded-lg border border-emerald-800 bg-court-950 px-3 py-2"
              value={playerLastName}
              onChange={(e) => setPlayerLastName(e.target.value)}
              required
            />
          </label>
          <label className="block text-sm">
            Player email
            <input
              type="email"
              className="mt-1 w-full rounded-lg border border-emerald-800 bg-court-950 px-3 py-2"
              value={playerEmail}
              onChange={(e) => setPlayerEmail(e.target.value)}
              required={user?.role === "PARENT"}
            />
          </label>
          <label className="block text-sm">
            Preferred position
            <select
              className="mt-1 w-full rounded-lg border border-emerald-800 bg-court-950 px-3 py-2"
              value={preferredPosition}
              onChange={(e) => setPreferredPosition(e.target.value as RosterPosition | "")}
            >
              <option value="">No preference</option>
              {ROSTER_POSITIONS.map((pos) => (
                <option key={pos} value={pos}>
                  {pos} · {ROSTER_POSITION_LABELS[pos]}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            Note
            <textarea
              className="mt-1 w-full rounded-lg border border-emerald-800 bg-court-950 px-3 py-2"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
            />
          </label>
          <button type="submit" className="rounded-lg bg-court-400 px-4 py-2 font-semibold text-court-950">
            Submit application
          </button>
        </form>
      ) : null}

      {!staff && detail && detail.applications.length > 0 ? (
        <section className="mb-8 rounded-2xl border border-emerald-900 bg-court-900/80 p-5">
          <p className="text-sm font-semibold">Your application</p>
          {detail.applications.map((app) => (
            <p key={app.id} className="mt-2 text-sm">
              {app.playerFirstName} {app.playerLastName} · {app.status}
            </p>
          ))}
        </section>
      ) : null}

      {staff ? (
        <section>
          <p className="mb-3 text-sm font-semibold">Player pool</p>
          <ul className="space-y-3">
            {detail?.applications.map((app) => (
              <li key={app.id} className="rounded-2xl border border-emerald-900 bg-court-900/80 p-5">
                <p className="text-lg font-semibold">
                  {app.playerFirstName} {app.playerLastName}
                </p>
                <p className="text-sm text-emerald-100/60">
                  Applied by {app.applicantName} ({app.applicantRole}) · {app.status}
                </p>
                <p className="mt-1 text-sm">
                  {app.playerEmail}
                  {app.preferredPosition
                    ? ` · ${app.preferredPosition} ${ROSTER_POSITION_LABELS[app.preferredPosition]}`
                    : ""}
                </p>
                {app.note ? <p className="mt-2 text-sm">{app.note}</p> : null}
                {app.status === "PENDING" ? (
                  <div className="mt-3 flex flex-wrap items-end gap-3">
                    <label className="block text-sm">
                      Jersey
                      <input
                        className="mt-1 w-20 rounded-lg border border-emerald-800 bg-court-950 px-3 py-2"
                        type="number"
                        min={0}
                        max={99}
                        value={jerseyByApp[app.id] ?? ""}
                        onChange={(e) =>
                          setJerseyByApp((current) => ({ ...current, [app.id]: Number(e.target.value) }))
                        }
                      />
                    </label>
                    <label className="block text-sm">
                      Position
                      <select
                        className="mt-1 rounded-lg border border-emerald-800 bg-court-950 px-3 py-2"
                        value={positionByApp[app.id] ?? app.preferredPosition ?? ""}
                        onChange={(e) =>
                          setPositionByApp((current) => ({
                            ...current,
                            [app.id]: e.target.value as RosterPosition | "",
                          }))
                        }
                      >
                        <option value="">No position yet</option>
                        {ROSTER_POSITIONS.map((pos) => (
                          <option key={pos} value={pos}>
                            {pos} · {ROSTER_POSITION_LABELS[pos]}
                          </option>
                        ))}
                      </select>
                    </label>
                    <button
                      type="button"
                      onClick={() => handleAccept(app)}
                      className="rounded-lg bg-court-400 px-3 py-2 text-sm font-semibold text-court-950"
                    >
                      Promote to roster
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDecline(app)}
                      className="rounded-lg border border-emerald-800 px-3 py-2 text-sm hover:border-court-400"
                    >
                      Decline
                    </button>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
          {detail && detail.applications.length === 0 ? (
            <p className="text-sm text-emerald-100/50">No applications yet.</p>
          ) : null}
        </section>
      ) : null}
    </main>
  );
}
