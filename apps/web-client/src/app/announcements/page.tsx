"use client";

/**
 * Announcement board: everyone reads; coaches and admins post.
 */

import { FormEvent, useEffect, useState } from "react";
import type { AnnouncementView, CreateAnnouncementRequest, PublicUser } from "@volleyball-manager/shared-types";
import { AppHeader } from "@/components/AppHeader";
import { api } from "@/lib/api";

/** Club news page. */
export default function AnnouncementsPage() {
  const [user, setUser] = useState<PublicUser | null>(null);
  const [items, setItems] = useState<AnnouncementView[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [title, setTitle] = useState("Bus leaves at 15:00 UTC");
  const [content, setContent] = useState("Meet at door 2. Bring both jerseys.");

  /** Reloads session + current announcements. */
  async function reload(): Promise<void> {
    const me = await api<PublicUser>("/auth/me");
    setUser(me);
    const list = await api<AnnouncementView[]>("/announcements");
    setItems(list);
  }

  useEffect(() => {
    reload().catch((err: unknown) => setError(err instanceof Error ? err.message : "Could not load announcements"));
  }, []);

  const canWrite = user?.role === "COACH" || user?.role === "ADMIN";

  /** COACH/ADMIN create a post. */
  async function handleCreate(event: FormEvent): Promise<void> {
    event.preventDefault();
    setError(null);
    setNotice(null);
    const body: CreateAnnouncementRequest = { title, content };
    try {
      await api("/announcements", { method: "POST", body: JSON.stringify(body) });
      setNotice("Posted.");
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not post");
    }
  }

  /** Author/ADMIN delete. */
  async function handleDelete(id: string): Promise<void> {
    setError(null);
    try {
      await api(`/announcements/${id}`, { method: "DELETE" });
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete");
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <AppHeader title="Announcements" />
      {error ? <p className="mb-4 text-red-300">{error}</p> : null}
      {notice ? <p className="mb-4 text-court-400">{notice}</p> : null}

      {canWrite ? (
        <form onSubmit={handleCreate} className="mb-8 space-y-3 rounded-2xl border border-emerald-900 bg-court-900/80 p-5">
          <p className="text-sm font-semibold">Post an announcement</p>
          <input
            className="w-full rounded-lg border border-emerald-800 bg-court-950 px-3 py-2"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            aria-label="Title"
            required
          />
          <textarea
            className="w-full rounded-lg border border-emerald-800 bg-court-950 px-3 py-2"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            aria-label="Content"
            rows={3}
            required
          />
          <button type="submit" className="rounded-lg bg-court-400 px-4 py-2 font-semibold text-court-950">
            Post
          </button>
        </form>
      ) : null}

      <ul className="space-y-3">
        {items.map((item) => (
          <li key={item.id} className="rounded-2xl border border-emerald-900 bg-court-900/80 p-5">
            <p className="text-lg font-semibold">{item.title}</p>
            <p className="mt-2 whitespace-pre-wrap text-sm">{item.content}</p>
            <p className="mt-2 text-xs text-emerald-100/50">
              {item.authorName} · {item.createdAt}
            </p>
            {canWrite && (user?.role === "ADMIN" || user?.id === item.authorId) ? (
              <button
                type="button"
                onClick={() => handleDelete(item.id)}
                className="mt-3 text-sm text-red-300 underline"
              >
                Delete
              </button>
            ) : null}
          </li>
        ))}
      </ul>
      {items.length === 0 && !error ? <p className="text-emerald-100/60">No current announcements.</p> : null}
    </main>
  );
}
