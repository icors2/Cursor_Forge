"use client";

/**
 * Shared header with sign-out. Used on coach and live pages.
 */

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
    <header className="mb-8 flex items-center justify-between">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-court-400">Volleyball Manager</p>
        <h1 className="text-2xl font-semibold">{title}</h1>
      </div>
      <button
        type="button"
        onClick={handleSignOut}
        className="rounded-lg border border-emerald-800 px-3 py-1.5 text-sm text-emerald-100 hover:border-court-400"
      >
        Sign out
      </button>
    </header>
  );
}
