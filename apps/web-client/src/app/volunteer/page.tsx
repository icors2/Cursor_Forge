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

/** Formats a UTC instant for display without converting away from the stored instant. */
function utcLabel(iso: string): string {
  return iso.replace("T", " ").replace(".000Z", "Z");
}

/** Volunteer signup + setup page. */
export default function VolunteerPage() {
  const [user, setUser] = useState<PublicUser | null>(null);
  const [slots, setSlots] = useState<VolunteerSlotView[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [title, setTitle] = useState("Score table");
  const [startTime, setStartTime] = useState("2026-09-21T16:00:00.000Z");
  const [endTime, setEndTime] = useState("2026-09-21T18:00:00.000Z");
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
  async function handleSignUp(slotId: string): Promise<void> {
    setPendingId(slotId);
    setError(null);
    setNotice(null);
    try {
      await api(`/volunteer/slots/${slotId}/registrations`, { method: "POST" });
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
    const body: CreateVolunteerSlotRequest = { title, startTime, endTime, capacity };
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
        Parents sign up. Admins create shifts. Full slots reject extra sign-ups (409) instead of overbooking.
      </p>
      {error ? <p className="mb-4 text-red-300">{error}</p> : null}
      {notice ? <p className="mb-4 text-court-400">{notice}</p> : null}

      {user?.role === "ADMIN" ? (
        <form onSubmit={handleCreate} className="mb-8 space-y-3 rounded-2xl border border-emerald-900 bg-court-900/80 p-5">
          <p className="text-sm font-semibold">Create a slot</p>
          <input
            className="w-full rounded-lg border border-emerald-800 bg-court-950 px-3 py-2"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            aria-label="Title"
            required
          />
          <input
            className="w-full rounded-lg border border-emerald-800 bg-court-950 px-3 py-2"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            aria-label="Start UTC"
            required
          />
          <input
            className="w-full rounded-lg border border-emerald-800 bg-court-950 px-3 py-2"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            aria-label="End UTC"
            required
          />
          <input
            className="w-full rounded-lg border border-emerald-800 bg-court-950 px-3 py-2"
            type="number"
            min={1}
            value={capacity}
            onChange={(e) => setCapacity(Number(e.target.value))}
            aria-label="Capacity"
            required
          />
          <button type="submit" className="rounded-lg bg-court-400 px-4 py-2 font-semibold text-court-950">
            Create slot
          </button>
        </form>
      ) : null}

      <ul className="space-y-3">
        {slots.map((slot) => {
          const full = slot.taken >= slot.capacity;
          return (
            <li key={slot.id} className="rounded-2xl border border-emerald-900 bg-court-900/80 p-5">
              <p className="text-lg font-semibold">{slot.title}</p>
              <p className="text-sm text-emerald-100/60">
                {utcLabel(slot.startTime)} – {utcLabel(slot.endTime)}
              </p>
              <p className="mt-1 text-sm">
                {slot.taken}/{slot.capacity} filled
                {full ? " · full" : ""}
                {slot.registered ? " · you're signed up" : ""}
              </p>
              {user?.role === "PARENT" ? (
                <button
                  type="button"
                  disabled={pendingId === slot.id || slot.registered || full}
                  onClick={() => handleSignUp(slot.id)}
                  className="mt-3 rounded-lg bg-court-600 px-4 py-2 text-sm font-semibold disabled:opacity-50"
                >
                  {slot.registered ? "Signed up" : full ? "Full" : pendingId === slot.id ? "Signing up…" : "Sign up"}
                </button>
              ) : null}
            </li>
          );
        })}
      </ul>
      {slots.length === 0 && !error ? <p className="text-emerald-100/60">No slots in the active season.</p> : null}
    </main>
  );
}
