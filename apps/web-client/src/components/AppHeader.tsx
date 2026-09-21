"use client";

/**
 * Shared header with club navigation and sign-out.
 */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { applyThemeColor, FALLBACK_THEME } from "@/lib/theme";

/** Top bar for authenticated views. */
export function AppHeader({ title }: { title: string }) {
  const router = useRouter();

  /** Clears the JWT cookie and returns to login. */
  async function handleSignOut(): Promise<void> {
    await api("/auth/logout", { method: "POST" }).catch(() => undefined);
    applyThemeColor(FALLBACK_THEME);
    router.push("/");
  }

  return (
    <header className="mb-8 flex items-center justify-between gap-4">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-court-400">Volleyball Manager</p>
        <h1 className="text-2xl font-semibold">{title}</h1>
      </div>
      <nav className="flex flex-wrap items-center gap-3 text-sm">
        <Link href="/home" className="text-emerald-100/80 hover:text-court-400">
          Home
        </Link>
        <Link href="/live" className="text-emerald-100/80 hover:text-court-400">
          Live
        </Link>
        <Link href="/calendar" className="text-emerald-100/80 hover:text-court-400">
          Calendar
        </Link>
        <Link href="/announcements" className="text-emerald-100/80 hover:text-court-400">
          News
        </Link>
        <Link href="/volunteer" className="text-emerald-100/80 hover:text-court-400">
          Volunteer
        </Link>
        <Link href="/coach" className="text-emerald-100/80 hover:text-court-400">
          Coach
        </Link>
        <Link href="/notes" className="text-emerald-100/80 hover:text-court-400">
          Notes
        </Link>
        <Link href="/teams" className="text-emerald-100/80 hover:text-court-400">
          Teams
        </Link>
        <Link href="/seasons" className="text-emerald-100/80 hover:text-court-400">
          Seasons
        </Link>
        <Link href="/dues" className="text-emerald-100/80 hover:text-court-400">
          Dues
        </Link>
        <Link href="/theme" className="text-emerald-100/80 hover:text-court-400">
          Theme
        </Link>
        <button
          type="button"
          onClick={handleSignOut}
          className="rounded-lg border border-emerald-800 px-3 py-1.5 text-emerald-100 hover:border-court-400"
        >
          Sign out
        </button>
      </nav>
    </header>
  );
}
