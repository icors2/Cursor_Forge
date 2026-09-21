"use client";

/**
 * Dues: PARENT/PLAYER see their own flag. ADMIN toggles isDuesPaid on a dedicated endpoint.
 */

import { useEffect, useState } from "react";
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

  /** ADMIN-only PATCH /users/:id/dues — never a generic user update. */
  async function handleToggle(target: PublicUser): Promise<void> {
    setPendingId(target.id);
    setError(null);
    const body: UpdateDuesRequest = { isDuesPaid: !target.isDuesPaid };
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
        Only an admin can change the dues flag. There is no generic profile update that accepts isDuesPaid.
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
        <ul className="space-y-3">
          {directory.map((row) => (
            <li key={row.id} className="flex items-center justify-between gap-4 rounded-2xl border border-emerald-900 bg-court-900/80 p-5">
              <div>
                <p className="font-semibold">
                  {row.firstName} {row.lastName}
                </p>
                <p className="text-sm text-emerald-100/60">
                  {row.role} · {row.isDuesPaid ? "paid" : "unpaid"}
                </p>
              </div>
              <button
                type="button"
                disabled={pendingId === row.id}
                onClick={() => handleToggle(row)}
                className="rounded-lg bg-court-600 px-3 py-2 text-sm font-semibold disabled:opacity-50"
              >
                {row.isDuesPaid ? "Mark unpaid" : "Mark paid"}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </main>
  );
}
