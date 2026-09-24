"use client";

/**
 * News board: posts plus a comment thread. Staff can delete comments and mute authors.
 */

import { FormEvent, useEffect, useState } from "react";
import type {
  AnnouncementCommentView,
  AnnouncementView,
  CreateAnnouncementRequest,
  PublicUser,
} from "@volleyball-manager/shared-types";
import { AppHeader } from "@/components/AppHeader";
import { api } from "@/lib/api";

/** Comments keyed by announcement id. */
type CommentMap = Record<string, AnnouncementCommentView[]>;

/** Club news page. */
export default function AnnouncementsPage() {
  const [user, setUser] = useState<PublicUser | null>(null);
  const [items, setItems] = useState<AnnouncementView[]>([]);
  const [comments, setComments] = useState<CommentMap>({});
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [title, setTitle] = useState("Bus leaves at 15:00 UTC");
  const [content, setContent] = useState("Meet at door 2. Bring both jerseys.");

  /** Reloads session, posts, and every comment thread. */
  async function reload(): Promise<void> {
    const me = await api<PublicUser>("/auth/me");
    setUser(me);
    const list = await api<AnnouncementView[]>("/announcements");
    setItems(list);
    const next: CommentMap = {};
    await Promise.all(
      list.map(async (item) => {
        next[item.id] = await api<AnnouncementCommentView[]>(`/announcements/${item.id}/comments`);
      }),
    );
    setComments(next);
  }

  useEffect(() => {
    reload().catch((err: unknown) => setError(err instanceof Error ? err.message : "Could not load announcements"));
  }, []);

  const canWrite = user?.role === "COACH" || user?.role === "ADMIN";
  const staff = canWrite;

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

  /** Author/ADMIN delete a post. */
  async function handleDelete(id: string): Promise<void> {
    setError(null);
    try {
      await api(`/announcements/${id}`, { method: "DELETE" });
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete");
    }
  }

  /** Any authenticated user posts a comment unless muted. */
  async function handleComment(event: FormEvent, announcementId: string): Promise<void> {
    event.preventDefault();
    setError(null);
    const body = { content: drafts[announcementId] ?? "" };
    try {
      await api(`/announcements/${announcementId}/comments`, { method: "POST", body: JSON.stringify(body) });
      setDrafts((current) => ({ ...current, [announcementId]: "" }));
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not comment");
    }
  }

  /** Author or staff delete a comment. */
  async function handleDeleteComment(announcementId: string, commentId: string): Promise<void> {
    setError(null);
    try {
      await api(`/announcements/${announcementId}/comments/${commentId}`, { method: "DELETE" });
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete comment");
    }
  }

  /** Staff mute a commenter. */
  async function handleMute(userId: string): Promise<void> {
    setError(null);
    try {
      await api("/announcements/mutes", { method: "POST", body: JSON.stringify({ userId }) });
      setNotice("Commenter muted.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not mute");
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <AppHeader title="News" />
      {error ? <p className="mb-4 text-red-300">{error}</p> : null}
      {notice ? <p className="mb-4 text-court-400">{notice}</p> : null}

      {canWrite ? (
        <form onSubmit={handleCreate} className="mb-8 space-y-3 rounded-2xl border border-emerald-900 bg-court-900/80 p-5">
          <p className="text-sm font-semibold">Post an announcement</p>
          <label className="block text-sm">
            Title
            <input
              className="mt-1 w-full rounded-lg border border-emerald-800 bg-court-950 px-3 py-2"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </label>
          <label className="block text-sm">
            Content
            <textarea
              className="mt-1 w-full rounded-lg border border-emerald-800 bg-court-950 px-3 py-2"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={3}
              required
            />
          </label>
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
              <button type="button" onClick={() => handleDelete(item.id)} className="mt-3 text-sm text-red-300 underline">
                Delete
              </button>
            ) : null}

            <ul className="mt-4 space-y-2">
              {(comments[item.id] ?? []).map((comment) => (
                <li key={comment.id} className="rounded-xl border border-emerald-900/70 bg-court-950/60 px-3 py-2">
                  <p className="text-sm">{comment.content}</p>
                  <p className="text-xs text-emerald-100/50">{comment.authorName}</p>
                  {user && (staff || user.id === comment.authorId) ? (
                    <div className="mt-1 flex gap-3 text-xs">
                      <button type="button" className="text-red-300 underline" onClick={() => handleDeleteComment(item.id, comment.id)}>
                        Delete
                      </button>
                      {staff && user.id !== comment.authorId ? (
                        <button type="button" className="text-amber-300 underline" onClick={() => handleMute(comment.authorId)}>
                          Mute
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>

            <form onSubmit={(event) => handleComment(event, item.id)} className="mt-3 space-y-2">
              <label className="block text-sm">
                Add a comment
                <textarea
                  className="mt-1 w-full rounded-lg border border-emerald-800 bg-court-950 px-3 py-2"
                  rows={2}
                  value={drafts[item.id] ?? ""}
                  onChange={(e) => setDrafts((current) => ({ ...current, [item.id]: e.target.value }))}
                  required
                />
              </label>
              <button type="submit" className="rounded-lg border border-emerald-800 px-3 py-1.5 text-sm">
                Comment
              </button>
            </form>
          </li>
        ))}
      </ul>
      {items.length === 0 && !error ? <p className="text-emerald-100/60">No current announcements.</p> : null}
    </main>
  );
}
