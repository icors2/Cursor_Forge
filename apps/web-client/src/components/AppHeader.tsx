"use client";

/**
 * Full-width top bar: role-aware nav buttons, active route, sign-out.
 */

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { PublicUser } from "@volleyball-manager/shared-types";
import { api } from "@/lib/api";
import { isActivePath, navLinksFor } from "@/lib/nav";
import { applyThemeColor, FALLBACK_THEME } from "@/lib/theme";

/** Top bar for authenticated views. */
export function AppHeader({ title }: { title: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<PublicUser | null>(null);

  useEffect(() => {
    api<PublicUser>("/auth/me")
      .then(setUser)
      .catch(() => setUser(null));
  }, []);

  /** Clears the JWT cookie and returns to login. */
  async function handleSignOut(): Promise<void> {
    await api("/auth/logout", { method: "POST" }).catch(() => undefined);
    applyThemeColor(FALLBACK_THEME);
    router.push("/");
  }

  const links = user ? navLinksFor(user.role) : [];

  return (
    <header className="mb-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
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
      </div>
      <nav className="mt-4 flex flex-wrap gap-2" aria-label="Club">
        {links.map((link) => {
          const active = isActivePath(pathname, link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={
                active
                  ? "rounded-lg bg-court-400 px-3 py-1.5 text-sm font-semibold text-court-950"
                  : "rounded-lg border border-emerald-800 px-3 py-1.5 text-sm font-semibold text-emerald-100 hover:border-court-400"
              }
              aria-current={active ? "page" : undefined}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
