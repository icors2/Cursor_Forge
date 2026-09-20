"use client";

/**
 * Shared header with sign-out. Used on coach and live pages.
 */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

/** Top bar for authenticated views. */
export function AppHeader({ title }: { title: string }) {
  const router = useRouter();

  /** Clears the JWT cookie and returns to login. */
  async function handleSignOut(): Promise<void> {
    await api("/auth/logout", { method: "POST" }).catch(() => undefined);
    router.push("/");
  }

  return (
    <header className="mb-8 flex items-center justify-between gap-4">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-court-400">Volleyball Manager</p>
        <h1 className="text-2xl font-semibold">{title}</h1>
      </div>
      <nav className="flex flex-wrap items-center gap-3 text-sm">
        <Link href="/live" className="text-emerald-100/80 hover:text-court-400">
          Live
        </Link>
        <Link href="/coach" className="text-emerald-100/80 hover:text-court-400">
          Coach
        </Link>
        <Link href="/volunteer" className="text-emerald-100/80 hover:text-court-400">
          Volunteer
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
