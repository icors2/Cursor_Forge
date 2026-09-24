"use client";

/**
 * Role-aware club hub. Links every first-party surface so the product is demoable.
 */

import Link from "next/link";
import { useEffect, useState } from "react";
import type { PublicUser } from "@volleyball-manager/shared-types";
import { AppHeader } from "@/components/AppHeader";
import { api } from "@/lib/api";
import { navLinksFor } from "@/lib/nav";

/** Club home after sign-in. */
export default function HomePage() {
  const [user, setUser] = useState<PublicUser | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<PublicUser>("/auth/me")
      .then(setUser)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Could not load session"));
  }, []);

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <AppHeader title={user ? `Hi, ${user.firstName}` : "Club home"} />
      {error ? <p className="mb-4 text-red-300">{error}</p> : null}
      {user ? (
        <p className="mb-6 text-sm text-emerald-100/60">
          Signed in as {user.role}
          {user.isDuesPaid ? "" : " · dues unpaid"}
        </p>
      ) : null}
      <ul className="grid gap-3 sm:grid-cols-2">
        {user
          ? navLinksFor(user.role)
              .filter((link) => link.href !== "/home")
              .map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="block h-full rounded-2xl border border-emerald-900 bg-court-900/80 p-5 hover:border-court-400"
                >
                  <p className="text-lg font-semibold">{link.label}</p>
                  <p className="mt-1 text-sm text-emerald-100/60">{link.body}</p>
                </Link>
              </li>
            ))
          : null}
      </ul>
    </main>
  );
}
