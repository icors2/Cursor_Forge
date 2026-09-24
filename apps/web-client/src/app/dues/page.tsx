"use client";

/**
 * Dues: PARENT/PLAYER see their own flag. ADMIN toggles isDuesPaid on a dedicated endpoint.
 */

import { useEffect, useMemo, useState } from "react";
import type { PublicUser, UpdateDuesRequest } from "@volleyball-manager/shared-types";
import { AppHeader } from "@/components/AppHeader";
import { api } from "@/lib/api";

/** Dues status + ADMIN table. */
export default function DuesPage() {
  const [user, setUser] = useState<PublicUser | null>(null);
  const [directory, setDirectory] = useState<PublicUser[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  /** Reloads /auth/me and, for ADMIN, GET /users. */
  async function reload(): Promise<void> {
    const me = await api<PublicUser>("/auth/me");
    setUser(me);
    if (me.role === "ADMIN") {
      const list = await api<PublicUser[]>("/users");
      setDirectory(list);
    }
  }

  useEffect(() => {
    reload().catch((err: unknown) => setError(err instanceof Error ? err.message : "Could not load dues"));
  }, []);

  const sorted = useMemo(() => {
    const rank = (role: PublicUser["role"]): number => (role === "PARENT" || role === "PLAYER" ? 0 : 1);
    return [...directory].sort((a, b) => rank(a.role) - rank(b.role) || a.lastName.localeCompare(b.lastName));
  }, [directory]);

  /** ADMIN-only PATCH /users/:id/dues — never a generic user update. */
  async function handleToggle(target: PublicUser, nextPaid: boolean): Promise<void> {
    const action = nextPaid ? "paid" : "unpaid";
    if (!window.confirm(`Mark ${target.firstName} ${target.lastName} as ${action}?`)) {
      return;
    }
    setPendingId(target.id);
    setError(null);
    const body: UpdateDuesRequest = { isDuesPaid: nextPaid };
    try {
      await api(`/users/${target.id}/dues`, { method: "PATCH", body: JSON.stringify(body) });
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update dues");
    } finally {
      setPendingId(null);
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <AppHeader title="Dues" />
      <p className="mb-6 text-sm text-emerald-100/60">
        Only an admin can change the dues flag. Check Paid to mark a parent or player current.
      </p>
      {error ? <p className="mb-4 text-red-300">{error}</p> : null}

      {user && user.role !== "ADMIN" ? (
        <section className="rounded-2xl border border-emerald-900 bg-court-900/80 p-5">
          <p className="text-lg font-semibold">
            {user.firstName} {user.lastName}
          </p>
          <p className="mt-2">{user.isDuesPaid ? "Dues are marked paid." : "Dues are unpaid."}</p>
        </section>
      ) : null}

      {user?.role === "ADMIN" ? (
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
                </td>
                <td className="py-3">{row.role}</td>
                <td className="py-3">
                  <label className="inline-flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={row.isDuesPaid}
                      disabled={pendingId === row.id}
                      onChange={(event) => handleToggle(row, event.target.checked)}
                    />
                    {row.isDuesPaid ? "Paid" : "Unpaid"}
                  </label>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
    </main>
  );
}
