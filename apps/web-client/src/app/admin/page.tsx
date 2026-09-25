"use client";

/**
 * Admin console: users/roles/dues, season archive, volunteer slots,
 * remembered ICS URL, and team registration — one place.
 */

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import type {
  CalendarSubscriptionView,
  CoachInviteKeyView,
  CreatedCoachInviteKey,
  PublicUser,
  Role,
  SeasonView,
  TeamRegistrationView,
  TeamView,
} from "@volleyball-manager/shared-types";
import { ROLES } from "@volleyball-manager/shared-types";
import { AppHeader } from "@/components/AppHeader";
import { api } from "@/lib/api";
import { fromDatetimeLocal, toDatetimeLocal } from "@/lib/datetime";

/** ADMIN-only club console. */
export default function AdminPage() {
  const [user, setUser] = useState<PublicUser | null>(null);
  const [directory, setDirectory] = useState<PublicUser[]>([]);
  const [teams, setTeams] = useState<TeamView[]>([]);
  const [registrations, setRegistrations] = useState<TeamRegistrationView[]>([]);
  const [subscription, setSubscription] = useState<CalendarSubscriptionView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("Demo1234!");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [role, setRole] = useState<Role>("PARENT");
  const [teamId, setTeamId] = useState("");
  const [seasonName, setSeasonName] = useState("Spring 2027");
  const [seasonYear, setSeasonYear] = useState(2027);
  const [slotTitle, setSlotTitle] = useState("Score table");
  const [slotStart, setSlotStart] = useState(toDatetimeLocal("2026-09-21T16:00:00.000Z"));
  const [slotEnd, setSlotEnd] = useState(toDatetimeLocal("2026-09-21T18:00:00.000Z"));
  const [slotCapacity, setSlotCapacity] = useState(2);
  const [coachKeys, setCoachKeys] = useState<CoachInviteKeyView[]>([]);
  const [keyLabel, setKeyLabel] = useState("");
  const [freshKey, setFreshKey] = useState<CreatedCoachInviteKey | null>(null);

  /** Reloads every admin surface. */
  async function reload(): Promise<void> {
    const me = await api<PublicUser>("/auth/me");
    setUser(me);
    if (me.role !== "ADMIN") {
      setError("Admin only.");
      return;
    }
    const [users, nextTeams, nextRegs, feed, keys] = await Promise.all([
      api<PublicUser[]>("/users"),
      api<TeamView[]>("/teams"),
      api<TeamRegistrationView[]>("/registrations"),
      api<CalendarSubscriptionView>("/calendar/subscription"),
      api<CoachInviteKeyView[]>("/auth/coach-keys"),
    ]);
    setDirectory(users);
    setTeams(nextTeams);
    setRegistrations(nextRegs);
    setSubscription(feed);
    setCoachKeys(keys);
    if (!teamId && nextTeams[0]) {
      setTeamId(nextTeams[0].id);
    }
  }

  useEffect(() => {
    reload().catch((err: unknown) => setError(err instanceof Error ? err.message : "Could not load admin"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sorted = useMemo(
    () => [...directory].sort((a, b) => a.lastName.localeCompare(b.lastName) || a.firstName.localeCompare(b.firstName)),
    [directory],
  );

  /** ADMIN provision. */
  async function handleProvision(event: FormEvent): Promise<void> {
    event.preventDefault();
    setError(null);
    setNotice(null);
    try {
      await api("/users", {
        method: "POST",
        body: JSON.stringify({ email, password, firstName, lastName, role }),
      });
      setNotice("Account created.");
      setEmail("");
      setFirstName("");
      setLastName("");
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not provision");
    }
  }

  /** Dedicated role write. */
  async function handleRole(target: PublicUser, next: Role): Promise<void> {
    if (next === target.role) return;
    if (!window.confirm(`Change ${target.firstName} ${target.lastName} to ${next}?`)) return;
    setError(null);
    try {
      await api(`/users/${target.id}/role`, { method: "PATCH", body: JSON.stringify({ role: next }) });
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not change role");
    }
  }

  /** Dedicated dues write. */
  async function handleDues(target: PublicUser, nextPaid: boolean): Promise<void> {
    if (!window.confirm(`Mark ${target.firstName} ${target.lastName} as ${nextPaid ? "paid" : "unpaid"}?`)) return;
    setError(null);
    try {
      await api(`/users/${target.id}/dues`, { method: "PATCH", body: JSON.stringify({ isDuesPaid: nextPaid }) });
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update dues");
    }
  }

  /** Open a team apply window. */
  async function handleOpenReg(event: FormEvent): Promise<void> {
    event.preventDefault();
    setError(null);
    setNotice(null);
    try {
      await api("/registrations", { method: "POST", body: JSON.stringify({ teamId }) });
      setNotice("Team registration opened.");
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not open registration");
    }
  }

  /** Archive the active season. */
  async function handleArchive(event: FormEvent): Promise<void> {
    event.preventDefault();
    if (!window.confirm(`Archive the active season and start ${seasonName}?`)) return;
    setError(null);
    setNotice(null);
    try {
      const result = await api<{ created: SeasonView }>("/seasons/archive", {
        method: "POST",
        body: JSON.stringify({ name: seasonName, year: seasonYear }),
      });
      setNotice(`Started ${result.created.name}. Re-seed locally to restore the demo.`);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not archive");
    }
  }

  /** ADMIN generates a one-time coach key. Plaintext is shown once. */
  async function handleGenerateKey(event: FormEvent): Promise<void> {
    event.preventDefault();
    setError(null);
    setNotice(null);
    try {
      const created = await api<CreatedCoachInviteKey>("/auth/coach-keys", {
        method: "POST",
        body: JSON.stringify(keyLabel.trim() ? { label: keyLabel.trim() } : {}),
      });
      setFreshKey(created);
      setKeyLabel("");
      setNotice("Copy the coach key now. It cannot be shown again.");
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not generate key");
    }
  }

  /** Copies the just-generated key to the clipboard. */
  async function handleCopyKey(): Promise<void> {
    if (!freshKey) return;
    await navigator.clipboard.writeText(freshKey.key);
    setNotice("Coach key copied.");
  }

  /** ADMIN deletes an unused invite. */
  async function handleRevokeKey(id: string): Promise<void> {
    if (!window.confirm("Revoke this unused coach key?")) return;
    setError(null);
    try {
      await api(`/auth/coach-keys/${id}`, { method: "DELETE" });
      if (freshKey?.id === id) {
        setFreshKey(null);
      }
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not revoke key");
    }
  }

  /** Create a volunteer slot. */
  async function handleSlot(event: FormEvent): Promise<void> {
    event.preventDefault();
    setError(null);
    setNotice(null);
    try {
      await api("/volunteer/slots", {
        method: "POST",
        body: JSON.stringify({
          title: slotTitle,
          startTime: fromDatetimeLocal(slotStart),
          endTime: fromDatetimeLocal(slotEnd),
          capacity: slotCapacity,
        }),
      });
      setNotice("Volunteer slot created.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create slot");
    }
  }

  if (user && user.role !== "ADMIN") {
    return (
      <main className="mx-auto max-w-3xl px-6 py-10">
        <AppHeader title="Admin" />
        <p className="text-red-300">Admin only.</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <AppHeader title="Admin console" />
      <p className="mb-6 text-sm text-emerald-100/60">
        Provision accounts, issue one-time coach keys, set roles and dues, open team registration, archive a season, and create volunteer slots.
      </p>
      {error ? <p className="mb-4 text-red-300">{error}</p> : null}
      {notice ? <p className="mb-4 text-court-400">{notice}</p> : null}

      <section className="mb-8 rounded-2xl border border-emerald-900 bg-court-900/80 p-5">
        <p className="text-sm font-semibold">Provision account</p>
        <form onSubmit={handleProvision} className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="block text-sm">
            First name
            <input className="mt-1 w-full rounded-lg border border-emerald-800 bg-court-950 px-3 py-2" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
          </label>
          <label className="block text-sm">
            Last name
            <input className="mt-1 w-full rounded-lg border border-emerald-800 bg-court-950 px-3 py-2" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
          </label>
          <label className="block text-sm">
            Email
            <input type="email" className="mt-1 w-full rounded-lg border border-emerald-800 bg-court-950 px-3 py-2" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </label>
          <label className="block text-sm">
            Temporary password
            <input type="password" className="mt-1 w-full rounded-lg border border-emerald-800 bg-court-950 px-3 py-2" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </label>
          <label className="block text-sm">
            Role
            <select className="mt-1 w-full rounded-lg border border-emerald-800 bg-court-950 px-3 py-2" value={role} onChange={(e) => setRole(e.target.value as Role)}>
              {ROLES.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
          <div className="flex items-end">
            <button type="submit" className="rounded-lg bg-court-400 px-4 py-2 font-semibold text-court-950">
              Create user
            </button>
          </div>
        </form>
      </section>

      <section className="mb-8 rounded-2xl border border-emerald-900 bg-court-900/80 p-5">
        <p className="text-sm font-semibold">Coach invite keys</p>
        <p className="mt-1 text-sm text-emerald-100/60">
          Each key is generated here and stored as a hash. Give one unused key to each new coach.
        </p>
        <form onSubmit={handleGenerateKey} className="mt-3 flex flex-wrap items-end gap-3">
          <label className="block text-sm">
            Label (optional)
            <input
              className="mt-1 rounded-lg border border-emerald-800 bg-court-950 px-3 py-2"
              value={keyLabel}
              onChange={(e) => setKeyLabel(e.target.value)}
              maxLength={80}
              placeholder="Fall 2026 staff"
            />
          </label>
          <button type="submit" className="rounded-lg bg-court-400 px-4 py-2 font-semibold text-court-950">
            Generate key
          </button>
        </form>
        {freshKey ? (
          <div className="mt-4 rounded-lg border border-court-400/40 bg-court-950 p-3">
            <p className="text-xs uppercase tracking-wide text-emerald-100/60">Copy now — not stored again</p>
            <p className="mt-2 break-all font-mono text-sm text-court-400">{freshKey.key}</p>
            <button type="button" onClick={handleCopyKey} className="mt-3 text-sm text-court-400 hover:underline">
              Copy key
            </button>
          </div>
        ) : null}
        <ul className="mt-4 space-y-2 text-sm">
          {coachKeys.length === 0 ? <li className="text-emerald-100/50">No keys yet.</li> : null}
          {coachKeys.map((row) => (
            <li key={row.id} className="flex flex-wrap items-center justify-between gap-2">
              <span>
                {row.label || "Unlabeled"} · {row.usedAt ? "Used" : "Unused"}
              </span>
              {!row.usedAt ? (
                <button type="button" onClick={() => handleRevokeKey(row.id)} className="text-red-200 hover:underline">
                  Revoke
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      </section>

      <section className="mb-8">
        <p className="mb-3 text-sm font-semibold">Directory</p>
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-emerald-900 text-emerald-100/60">
              <th className="py-2">Name</th>
              <th className="py-2">Role</th>
              <th className="py-2">Paid</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((row) => (
              <tr key={row.id} className="border-b border-emerald-900/60">
                <td className="py-3">
                  {row.firstName} {row.lastName}
                  <span className="block text-xs text-emerald-100/50">{row.email}</span>
                </td>
                <td className="py-3">
                  <select
                    className="rounded-lg border border-emerald-800 bg-court-950 px-2 py-1"
                    value={row.role}
                    onChange={(e) => handleRole(row, e.target.value as Role)}
                  >
                    {ROLES.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="py-3">
                  <label className="inline-flex items-center gap-2">
                    <input type="checkbox" checked={row.isDuesPaid} onChange={(e) => handleDues(row, e.target.checked)} />
                    {row.isDuesPaid ? "Paid" : "Unpaid"}
                  </label>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="mb-8 rounded-2xl border border-emerald-900 bg-court-900/80 p-5">
        <p className="text-sm font-semibold">Team registration</p>
        <form onSubmit={handleOpenReg} className="mt-3 flex flex-wrap items-end gap-3">
          <label className="block text-sm">
            Team
            <select className="mt-1 rounded-lg border border-emerald-800 bg-court-950 px-3 py-2" value={teamId} onChange={(e) => setTeamId(e.target.value)}>
              {teams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </select>
          </label>
          <button type="submit" className="rounded-lg bg-court-400 px-4 py-2 font-semibold text-court-950">
            Open registration
          </button>
        </form>
        <ul className="mt-4 space-y-2 text-sm">
          {registrations.map((row) => (
            <li key={row.id}>
              <Link href={`/registrations/${row.id}`} className="text-court-400 hover:underline">
                {row.teamName}
              </Link>{" "}
              · {row.isOpen ? "Open" : "Closed"} · {row.applicationCount} in pool
            </li>
          ))}
        </ul>
      </section>

      <section className="mb-8 rounded-2xl border border-emerald-900 bg-court-900/80 p-5">
        <p className="text-sm font-semibold">Remembered calendar URL</p>
        <p className="mt-2 break-all text-sm text-emerald-100/70">
          {subscription?.url ? subscription.url : "None yet. Import an ICS on Calendar."}
        </p>
        <Link href="/calendar" className="mt-2 inline-block text-sm text-court-400 hover:underline">
          Open Calendar
        </Link>
      </section>

      <section className="mb-8 rounded-2xl border border-emerald-900 bg-court-900/80 p-5">
        <p className="text-sm font-semibold">Create volunteer slot</p>
        <form onSubmit={handleSlot} className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="block text-sm">
            Title
            <input className="mt-1 w-full rounded-lg border border-emerald-800 bg-court-950 px-3 py-2" value={slotTitle} onChange={(e) => setSlotTitle(e.target.value)} required />
          </label>
          <label className="block text-sm">
            Capacity
            <input className="mt-1 w-full rounded-lg border border-emerald-800 bg-court-950 px-3 py-2" type="number" min={1} value={slotCapacity} onChange={(e) => setSlotCapacity(Number(e.target.value))} required />
          </label>
          <label className="block text-sm">
            Start
            <input type="datetime-local" className="mt-1 w-full rounded-lg border border-emerald-800 bg-court-950 px-3 py-2" value={slotStart} onChange={(e) => setSlotStart(e.target.value)} required />
          </label>
          <label className="block text-sm">
            End
            <input type="datetime-local" className="mt-1 w-full rounded-lg border border-emerald-800 bg-court-950 px-3 py-2" value={slotEnd} onChange={(e) => setSlotEnd(e.target.value)} required />
          </label>
          <button type="submit" className="rounded-lg bg-court-400 px-4 py-2 font-semibold text-court-950">
            Create slot
          </button>
        </form>
      </section>

      <section className="rounded-2xl border border-emerald-900 bg-court-900/80 p-5">
        <p className="text-sm font-semibold">Archive the active season</p>
        <form onSubmit={handleArchive} className="mt-3 flex flex-wrap items-end gap-3">
          <label className="block text-sm">
            New season name
            <input className="mt-1 rounded-lg border border-emerald-800 bg-court-950 px-3 py-2" value={seasonName} onChange={(e) => setSeasonName(e.target.value)} required />
          </label>
          <label className="block text-sm">
            Year
            <input className="mt-1 w-28 rounded-lg border border-emerald-800 bg-court-950 px-3 py-2" type="number" value={seasonYear} onChange={(e) => setSeasonYear(Number(e.target.value))} required />
          </label>
          <button type="submit" className="rounded-lg border border-red-400/60 px-4 py-2 text-sm text-red-200">
            Archive and start new season
          </button>
        </form>
      </section>
    </main>
  );
}
