"use client";

/**
 * Theme settings: everyone edits their own accent; ADMIN can still set others.
 */

import { FormEvent, useEffect, useState } from "react";
import type { PublicUser, UpdateThemeRequest } from "@volleyball-manager/shared-types";
import { AppHeader } from "@/components/AppHeader";
import { api } from "@/lib/api";
import { applyThemeColor, FALLBACK_THEME, normalizeThemeHex } from "@/lib/theme";

/** Draft hex keyed by user id. */
type Drafts = Record<string, string>;

/** Self-serve theme picker plus optional ADMIN directory. */
export default function ThemePage() {
  const [user, setUser] = useState<PublicUser | null>(null);
  const [directory, setDirectory] = useState<PublicUser[]>([]);
  const [drafts, setDrafts] = useState<Drafts>({});
  const [mine, setMine] = useState(FALLBACK_THEME);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  /** Reloads /auth/me and, for ADMIN, the account directory. */
  async function reload(): Promise<void> {
    const me = await api<PublicUser>("/auth/me");
    setUser(me);
    applyThemeColor(me.themeColor);
    setMine(me.themeColor || FALLBACK_THEME);
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

  /** Updates the draft hex for one account. */
  function handleDraft(id: string, value: string): void {
    setDrafts((current) => ({ ...current, [id]: value }));
  }

  /** PATCH /users/me/theme for the signed-in account. */
  async function handleSaveMine(event: FormEvent): Promise<void> {
    event.preventDefault();
    setError(null);
    setNotice(null);
    const hex = normalizeThemeHex(mine);
    if (!hex) {
      setError("Use a 6-digit hex color such as #3dcf8e.");
      return;
    }
    setPendingId("me");
    const body: UpdateThemeRequest = { themeColor: hex };
    try {
      const updated = await api<PublicUser>("/users/me/theme", {
        method: "PATCH",
        body: JSON.stringify(body),
      });
      applyThemeColor(updated.themeColor);
      setUser(updated);
      setMine(updated.themeColor);
      setNotice("Saved your theme.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save theme");
    } finally {
      setPendingId(null);
    }
  }

  /** ADMIN PATCH /users/:id/theme. */
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
        setMine(updated.themeColor);
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
        Accent color is per account. Everyone can change their own; admins can still set someone else.
      </p>
      {error ? <p className="mb-4 text-red-300">{error}</p> : null}
      {notice ? <p className="mb-4 text-court-400">{notice}</p> : null}

      {user ? (
        <form onSubmit={handleSaveMine} className="mb-8 rounded-2xl border border-emerald-900 bg-court-900/80 p-5">
          <p className="font-semibold">Your accent</p>
          <div className="mt-3 flex flex-wrap items-end gap-3">
            <label className="text-sm">
              Color
              <input
                type="color"
                className="mt-1 block h-10 w-14 cursor-pointer rounded border border-emerald-800 bg-court-950"
                value={normalizeThemeHex(mine) ?? FALLBACK_THEME}
                onChange={(e) => setMine(e.target.value)}
              />
            </label>
            <label className="text-sm">
              Hex
              <input
                className="mt-1 block w-28 rounded-lg border border-emerald-800 bg-court-950 px-3 py-2 font-mono text-sm"
                value={mine}
                onChange={(e) => setMine(e.target.value)}
                spellCheck={false}
              />
            </label>
            <button
              type="submit"
              disabled={pendingId === "me"}
              className="rounded-lg bg-court-400 px-4 py-2 text-sm font-semibold text-court-950 disabled:opacity-50"
            >
              {pendingId === "me" ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
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
