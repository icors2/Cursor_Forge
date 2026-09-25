"use client";

/**
 * Volunteer board: list active-season slots, PARENT sign-up, ADMIN create.
 */

import { FormEvent, useEffect, useState } from "react";
import type {
  CreateVolunteerSlotRequest,
  PublicUser,
  VolunteerSlotView,
} from "@volleyball-manager/shared-types";
import { AppHeader } from "@/components/AppHeader";
import { api } from "@/lib/api";
import { fromDatetimeLocal, toDatetimeLocal, utcLabel } from "@/lib/datetime";

/** Volunteer signup + setup page. */
export default function VolunteerPage() {
  const [user, setUser] = useState<PublicUser | null>(null);
  const [slots, setSlots] = useState<VolunteerSlotView[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [title, setTitle] = useState("Score table");
  const [startTime, setStartTime] = useState(toDatetimeLocal("2026-09-21T16:00:00.000Z"));
  const [endTime, setEndTime] = useState(toDatetimeLocal("2026-09-21T18:00:00.000Z"));
  const [capacity, setCapacity] = useState(2);

  /** Loads the current user and active-season slots. */
  async function reload(): Promise<void> {
    const me = await api<PublicUser>("/auth/me");
    setUser(me);
    const list = await api<VolunteerSlotView[]>("/volunteer/slots");
    setSlots(list);
  }

  useEffect(() => {
    reload().catch((err: unknown) => setError(err instanceof Error ? err.message : "Could not load slots"));
  }, []);

  /** PARENT claims one seat; 409 is shown when the slot is full or already claimed. */
  async function handleSignUp(slot: VolunteerSlotView): Promise<void> {
    if (user?.role !== "PARENT") {
      return;
    }
    const full = slot.taken >= slot.capacity;
    if (slot.registered || full || !user.isDuesPaid) {
      return;
    }
    setPendingId(slot.id);
    setError(null);
    setNotice(null);
    try {
      await api(`/volunteer/slots/${slot.id}/registrations`, { method: "POST" });
      setNotice("You're signed up.");
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-up failed");
    } finally {
      setPendingId(null);
    }
  }

  /** ADMIN creates a slot on the active season. */
  async function handleCreate(event: FormEvent): Promise<void> {
    event.preventDefault();
    setError(null);
    setNotice(null);
    const body: CreateVolunteerSlotRequest = {
      title,
      startTime: fromDatetimeLocal(startTime),
      endTime: fromDatetimeLocal(endTime),
      capacity,
    };
    try {
      await api("/volunteer/slots", { method: "POST", body: JSON.stringify(body) });
      setNotice("Slot created.");
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create slot");
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <AppHeader title="Volunteer slots" />
      <p className="mb-6 text-sm text-emerald-100/60">
        Parents click a slot to sign up. Admins create shifts. Full slots reject extra sign-ups (409).
      </p>
      {user && user.role !== "PARENT" ? (
        <p className="mb-4 text-sm text-emerald-100/60">Parents sign up from this page.</p>
      ) : null}
      {error ? <p className="mb-4 text-red-300">{error}</p> : null}
      {notice ? <p className="mb-4 text-court-400">{notice}</p> : null}

      {user?.role === "ADMIN" ? (
        <form onSubmit={handleCreate} className="mb-8 space-y-3 rounded-2xl border border-emerald-900 bg-court-900/80 p-5">
          <p className="text-sm font-semibold">Create a slot</p>
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
            Start
            <input
              type="datetime-local"
              className="mt-1 w-full rounded-lg border border-emerald-800 bg-court-950 px-3 py-2"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              required
            />
          </label>
          <label className="block text-sm">
            End
            <input
              type="datetime-local"
              className="mt-1 w-full rounded-lg border border-emerald-800 bg-court-950 px-3 py-2"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              required
            />
          </label>
          <label className="block text-sm">
            Capacity
            <input
              className="mt-1 w-full rounded-lg border border-emerald-800 bg-court-950 px-3 py-2"
              type="number"
              min={1}
              value={capacity}
              onChange={(e) => setCapacity(Number(e.target.value))}
              required
            />
          </label>
          <button type="submit" className="rounded-lg bg-court-400 px-4 py-2 font-semibold text-court-950">
            Create slot
          </button>
        </form>
      ) : null}

      <ul className="space-y-3">
        {slots.map((slot) => {
          const full = slot.taken >= slot.capacity;
          const unpaid = user?.role === "PARENT" && !user.isDuesPaid;
          const blocked = slot.registered || full || unpaid;
          const reason = slot.registered
            ? "Already signed up"
            : full
              ? "Slot is full"
              : unpaid
                ? "Dues unpaid"
                : null;
          return (
            <li key={slot.id}>
              <button
                type="button"
                disabled={user?.role !== "PARENT" || blocked || pendingId === slot.id}
                onClick={() => handleSignUp(slot)}
                className="w-full rounded-2xl border border-emerald-900 bg-court-900/80 p-5 text-left hover:border-court-400 disabled:cursor-not-allowed disabled:opacity-70"
              >
                <p className="text-lg font-semibold">{slot.title}</p>
                <p className="text-sm text-emerald-100/60">
                  {utcLabel(slot.startTime)} – {utcLabel(slot.endTime)}
                </p>
                <p className="mt-1 text-sm">
                  {slot.taken}/{slot.capacity} filled
                  {reason ? ` · ${reason}` : user?.role === "PARENT" ? " · click to sign up" : ""}
                </p>
              </button>
            </li>
          );
        })}
      </ul>
      {slots.length === 0 && !error ? <p className="text-emerald-100/60">No slots in the active season.</p> : null}
    </main>
  );
}
