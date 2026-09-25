"use client";

/**
 * Public PARENT/PLAYER signup, plus COACH when a one-time admin-generated key is entered.
 */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import type { LoginResponse, RegisterRole } from "@volleyball-manager/shared-types";
import { api } from "@/lib/api";
import { applyThemeColor } from "@/lib/theme";

/** Self-serve signup form. */
export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [role, setRole] = useState<RegisterRole>("PARENT");
  const [coachKey, setCoachKey] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  /** Creates the account and lands on the role-appropriate next page. */
  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const body: Record<string, string> = { email, password, firstName, lastName, role };
      if (role === "COACH") {
        body.coachKey = coachKey.trim();
      }
      const { user } = await api<LoginResponse>("/auth/register", {
        method: "POST",
        body: JSON.stringify(body),
      });
      applyThemeColor(user.themeColor);
      router.push(user.role === "COACH" ? "/home" : "/registrations");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create account");
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
      <p className="text-sm uppercase tracking-[0.2em] text-court-400">Volleyball Manager</p>
      <h1 className="mt-2 text-3xl font-semibold">Create an account</h1>
      <p className="mt-2 text-sm text-emerald-100/70">
        Players and parents register here, then apply to a team. Coaches need a one-time key from an admin.
      </p>
      <form onSubmit={handleSubmit} className="mt-8 space-y-4 rounded-2xl border border-emerald-900/80 bg-court-900/80 p-6">
        <label className="block text-sm">
          First name
          <input
            className="mt-1 w-full rounded-lg border border-emerald-800 bg-court-950 px-3 py-2"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            required
          />
        </label>
        <label className="block text-sm">
          Last name
          <input
            className="mt-1 w-full rounded-lg border border-emerald-800 bg-court-950 px-3 py-2"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            required
          />
        </label>
        <label className="block text-sm">
          Email
          <input
            className="mt-1 w-full rounded-lg border border-emerald-800 bg-court-950 px-3 py-2"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>
        <label className="block text-sm">
          Password
          <input
            className="mt-1 w-full rounded-lg border border-emerald-800 bg-court-950 px-3 py-2"
            type="password"
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>
        <label className="block text-sm">
          I am a
          <select
            className="mt-1 w-full rounded-lg border border-emerald-800 bg-court-950 px-3 py-2"
            value={role}
            onChange={(e) => setRole(e.target.value as RegisterRole)}
          >
            <option value="PARENT">Parent</option>
            <option value="PLAYER">Player</option>
            <option value="COACH">Coach</option>
          </select>
        </label>
        {role === "COACH" ? (
          <label className="block text-sm">
            Coach key
            <input
              className="mt-1 w-full rounded-lg border border-emerald-800 bg-court-950 px-3 py-2 font-mono"
              value={coachKey}
              onChange={(e) => setCoachKey(e.target.value)}
              autoComplete="off"
              spellCheck={false}
              required
              minLength={20}
              placeholder="Paste the key from your admin"
            />
          </label>
        ) : null}
        {error ? <p className="text-sm text-red-300">{error}</p> : null}
        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-lg bg-court-400 px-4 py-2 font-semibold text-court-950 disabled:opacity-60"
        >
          {pending ? "Creating…" : "Create account"}
        </button>
      </form>
      <p className="mt-4 text-sm text-emerald-100/70">
        Already have an account?{" "}
        <Link href="/" className="font-semibold text-court-400 hover:underline">
          Sign in
        </Link>
      </p>
    </main>
  );
}
