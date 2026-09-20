"use client";

/**
 * Login screen. Seeded demo accounts are listed on the card.
 */

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import type { LoginResponse, PublicUser } from "@volleyball-manager/shared-types";
import { api } from "@/lib/api";
import { applyThemeColor } from "@/lib/theme";

/** After login, everyone lands on the role-aware club home. */
function homeFor(_user: PublicUser): string {
  return "/home";
}

/** First-slice sign-in form. */
export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("coach@demo.local");
  const [password, setPassword] = useState("Demo1234!");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  /** Submits credentials to POST /auth/login. */
  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const { user } = await api<LoginResponse>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      applyThemeColor(user.themeColor);
      router.push(homeFor(user));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
      <p className="text-sm uppercase tracking-[0.2em] text-court-400">Volleyball Manager</p>
      <h1 className="mt-2 text-3xl font-semibold">Sign in to the club</h1>
      <p className="mt-2 text-sm text-emerald-100/70">
        Coach records live stats. Parents watch the board update without a reload.
      </p>
      <form onSubmit={handleSubmit} className="mt-8 space-y-4 rounded-2xl border border-emerald-900/80 bg-court-900/80 p-6 shadow-xl">
        <label className="block text-sm">
          Email
          <input
            className="mt-1 w-full rounded-lg border border-emerald-800 bg-court-950 px-3 py-2 text-emerald-50 outline-none focus:border-court-400"
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>
        <label className="block text-sm">
          Password
          <input
            className="mt-1 w-full rounded-lg border border-emerald-800 bg-court-950 px-3 py-2 text-emerald-50 outline-none focus:border-court-400"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>
        {error ? <p className="text-sm text-red-300">{error}</p> : null}
        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-lg bg-court-400 px-4 py-2 font-semibold text-court-950 disabled:opacity-60"
        >
          {pending ? "Signing in…" : "Sign in"}
        </button>
      </form>
      <p className="mt-6 text-xs leading-5 text-emerald-100/50">
        Demo: coach@demo.local, parent@demo.local, player@demo.local, admin@demo.local,
        parent-unpaid@demo.local — password Demo1234!
      </p>
    </main>
  );
}
