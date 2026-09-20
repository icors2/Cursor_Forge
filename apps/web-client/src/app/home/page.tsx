"use client";

/**
 * Role-aware club hub. Links every first-party surface so the product is demoable.
 */

import Link from "next/link";
import { useEffect, useState } from "react";
import type { PublicUser } from "@volleyball-manager/shared-types";
import { AppHeader } from "@/components/AppHeader";
import { api } from "@/lib/api";

/** One navigation card on the hub. */
interface HubLink {
  /** Destination path. */
  href: string;
  /** Card title. */
  title: string;
  /** One-line description. */
  body: string;
}

/** Builds the link list for the signed-in role. */
function linksFor(role: PublicUser["role"]): HubLink[] {
  const common: HubLink[] = [
    { href: "/live", title: "Live board", body: "Watch timestamped stats as they happen." },
    { href: "/calendar", title: "Calendar", body: "Upcoming games and an iCal subscribe link." },
    { href: "/announcements", title: "Announcements", body: "Club news from coaches." },
    { href: "/teams", title: "Teams", body: "Active-season roster." },
    { href: "/dues", title: "Dues", body: "See (or, as admin, set) the dues flag." },
    { href: "/theme", title: "Theme", body: "Account accent color (admin edits; everyone sees their own)." },
  ];
  if (role === "PARENT" || role === "ADMIN") {
    common.push({ href: "/volunteer", title: "Volunteer", body: "Sign up for a shift or create slots." });
  }
  if (role === "COACH" || role === "ADMIN") {
    common.push(
      { href: "/coach", title: "Coach pad", body: "Record live stats." },
      { href: "/notes", title: "Coach notes", body: "Private observations about players." },
    );
  }
  if (role === "ADMIN") {
    common.push({ href: "/seasons", title: "Seasons", body: "Archive the current season and start a new one." });
  } else {
    common.push({ href: "/seasons", title: "Seasons", body: "See the active season and historical archives." });
  }
  return common;
}

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
          ? linksFor(user.role).map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="block h-full rounded-2xl border border-emerald-900 bg-court-900/80 p-5 hover:border-court-400"
                >
                  <p className="text-lg font-semibold">{link.title}</p>
                  <p className="mt-1 text-sm text-emerald-100/60">{link.body}</p>
                </Link>
              </li>
            ))
          : null}
      </ul>
    </main>
  );
}
