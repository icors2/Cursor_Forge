"use client";

/**
 * Theme settings: ADMIN edits each account's accent; others see their assigned color only.
 */

import { FormEvent, useEffect, useState } from "react";
import type { PublicUser, UpdateThemeRequest } from "@volleyball-manager/shared-types";
import { AppHeader } from "@/components/AppHeader";
import { api } from "@/lib/api";
import { applyThemeColor, FALLBACK_THEME, normalizeThemeHex } from "@/lib/theme";

/** Draft hex keyed by user id for the color wheel + text field. */
type Drafts = Record<string, string>;

/** Per-account theme editor (ADMIN) or read-only swatch (everyone else). */
export default function ThemePage() {
  const [user, setUser] = useState<PublicUser | null>(null);
  const [directory, setDirectory] = useState<PublicUser[]>([]);
  const [drafts, setDrafts] = useState<Drafts>({});
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  /** Reloads /auth/me and, for ADMIN, the account directory. */
  async function reload(): Promise<void> {
    const me = await api<PublicUser>("/auth/me");
    setUser(me);
    applyThemeColor(me.themeColor);
    if (me.role === "ADMIN") {
      const list = await api<PublicUser[]>("/users");
      setDirectory(list);
      const next: Drafts = {};
      for (const row of list) {
        next[row.id] = row.themeColor || FALLBACK_THEME;
      }
      setDrafts(next);
    }
  }

  useEffect(() => {
    reload().catch((err: unknown) => setError(err instanceof Error ? err.message : "Could not load theme"));
  }, []);

  /** Updates the draft hex for one account (color input or typed field). */
  function handleDraft(id: string, value: string): void {
    setDrafts((current) => ({ ...current, [id]: value }));
  }

  /** ADMIN PATCH /users/:id/theme — never a generic user update. */
  async function handleSave(event: FormEvent, target: PublicUser): Promise<void> {
    event.preventDefault();
    setError(null);
    setNotice(null);
    const hex = normalizeThemeHex(drafts[target.id] ?? "");
    if (!hex) {
      setError("Use a 6-digit hex color such as #3dcf8e.");
      return;
    }
    setPendingId(target.id);
    const body: UpdateThemeRequest = { themeColor: hex };
    try {
      const updated = await api<PublicUser>(`/users/${target.id}/theme`, {
        method: "PATCH",
        body: JSON.stringify(body),
      });
      if (user && updated.id === user.id) {
        applyThemeColor(updated.themeColor);
        setUser(updated);
      }
      setNotice(`Saved theme for ${updated.firstName}.`);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save theme");
    } finally {
      setPendingId(null);
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <AppHeader title="Theme" />
      <p className="mb-6 text-sm text-emerald-100/60">
        Accent color is per account and applies to every module after sign-in. Only an admin can change it.
      </p>
      {error ? <p className="mb-4 text-red-300">{error}</p> : null}
      {notice ? <p className="mb-4 text-court-400">{notice}</p> : null}

      {user && user.role !== "ADMIN" ? (
        <section className="rounded-2xl border border-emerald-900 bg-court-900/80 p-5">
          <p className="text-lg font-semibold">
            {user.firstName} {user.lastName}
          </p>
          <p className="mt-2 text-sm text-emerald-100/60">Your assigned accent</p>
          <div className="mt-3 flex items-center gap-3">
            <span
              className="h-10 w-10 rounded-lg border border-emerald-800"
              style={{ backgroundColor: user.themeColor || FALLBACK_THEME }}
              aria-hidden
            />
            <code className="text-sm">{user.themeColor || FALLBACK_THEME}</code>
          </div>
        </section>
      ) : null}

      {user?.role === "ADMIN" ? (
        <ul className="space-y-3">
          {directory.map((row) => (
            <li key={row.id} className="rounded-2xl border border-emerald-900 bg-court-900/80 p-5">
              <form onSubmit={(event) => handleSave(event, row)} className="flex flex-wrap items-end gap-3">
                <div className="min-w-[10rem] flex-1">
                  <p className="font-semibold">
                    {row.firstName} {row.lastName}
                  </p>
                  <p className="text-sm text-emerald-100/60">{row.role}</p>
                </div>
                <label className="text-sm">
                  Color
                  <input
                    type="color"
                    className="mt-1 block h-10 w-14 cursor-pointer rounded border border-emerald-800 bg-court-950"
                    value={normalizeThemeHex(drafts[row.id] ?? FALLBACK_THEME) ?? FALLBACK_THEME}
                    onChange={(e) => handleDraft(row.id, e.target.value)}
                    aria-label={`Color wheel for ${row.firstName}`}
                  />
                </label>
                <label className="text-sm">
                  Hex
                  <input
                    className="mt-1 block w-28 rounded-lg border border-emerald-800 bg-court-950 px-3 py-2 font-mono text-sm"
                    value={drafts[row.id] ?? FALLBACK_THEME}
                    onChange={(e) => handleDraft(row.id, e.target.value)}
                    aria-label={`Hex for ${row.firstName}`}
                    spellCheck={false}
                  />
                </label>
                <button
                  type="submit"
                  disabled={pendingId === row.id}
                  className="rounded-lg bg-court-400 px-4 py-2 text-sm font-semibold text-court-950 disabled:opacity-50"
                >
                  {pendingId === row.id ? "Saving…" : "Save"}
                </button>
              </form>
            </li>
          ))}
        </ul>
      ) : null}
    </main>
  );
}
