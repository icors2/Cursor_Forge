/**
 * ICS parse + team matching for multi-team club feeds (Varsity / JV / Middle School).
 */

import { BadRequestException } from "@nestjs/common";
import type { CalendarImportEvent } from "@volleyball-manager/shared-types";

/** Active-season team used only for name matching. */
export interface ImportTeam {
  /** Team id. */
  id: string;
  /** Display name. */
  name: string;
}

/** Parsed VEVENT before team mapping. */
interface RawEvent {
  /** ICS UID. */
  uid: string;
  /** Kickoff if parseable. */
  scheduledAt: Date | null;
  /** Combined text used for matching. */
  haystack: string;
  /** SUMMARY line. */
  summary: string;
}

/** Varsity / JV / middle school buckets inferred from text. */
type TeamLevel = "varsity" | "jv" | "middle" | null;

const MAX_ICS_BYTES = 1_000_000;
const FETCH_MS = 10_000;

/** Unfolds RFC 5545 folded lines. */
function unfoldIcs(ics: string): string[] {
  const raw = ics.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  const lines: string[] = [];
  for (const line of raw) {
    if ((line.startsWith(" ") || line.startsWith("\t")) && lines.length > 0) {
      lines[lines.length - 1] += line.slice(1);
    } else {
      lines.push(line);
    }
  }
  return lines;
}

/** Parses DTSTART / DTEND compact DATE-TIME. Non-UTC TZIDs are treated as UTC for later edit. */
export function parseIcalDateTime(property: string, value: string): Date | null {
  const compact = value.trim().replace(/Z$/i, "");
  const match = compact.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2}))?$/);
  if (!match) {
    return null;
  }
  const iso = `${match[1]}-${match[2]}-${match[3]}T${match[4] ?? "00"}:${match[5] ?? "00"}:${match[6] ?? "00"}Z`;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  void property;
  return date;
}

/** Classifies Varsity / JV / Middle School from free text. */
export function levelFromText(text: string): TeamLevel {
  const value = text.toLowerCase();
  if (/\bmiddle school\b|\bmiddle\b|\bms\b/.test(value)) {
    return "middle";
  }
  if (/\bjunior varsity\b|\bjv\b/.test(value)) {
    return "jv";
  }
  if (/\bvarsity\b/.test(value)) {
    return "varsity";
  }
  return null;
}

/** Picks the best active-season team for an event. */
export function matchTeamId(teams: ImportTeam[], haystack: string): string | null {
  const lower = haystack.toLowerCase();
  const byName = [...teams]
    .sort((a, b) => b.name.length - a.name.length)
    .find((team) => lower.includes(team.name.toLowerCase()));
  if (byName) {
    return byName.id;
  }
  const eventLevel = levelFromText(haystack);
  if (eventLevel) {
    const leveled = teams.filter((team) => levelFromText(team.name) === eventLevel);
    if (leveled.length === 1) {
      return leveled[0].id;
    }
    if (eventLevel === "varsity") {
      const fallback = teams.filter((team) => levelFromText(team.name) === null);
      if (fallback.length === 1) {
        return fallback[0].id;
      }
    }
  }
  return null;
}

/** Opponent from SUMMARY, preferring the side that is not our team. */
export function opponentFromSummary(summary: string, teams: ImportTeam[], teamId: string | null): string {
  const parts = summary.split(/\s+vs\.?\s+/i).map((part) => part.trim()).filter(Boolean);
  const team = teams.find((row) => row.id === teamId);
  if (parts.length === 2) {
    const [left, right] = parts;
    if (team && right.toLowerCase().includes(team.name.toLowerCase())) {
      return left;
    }
    if (team && left.toLowerCase().includes(team.name.toLowerCase())) {
      return right;
    }
    return right;
  }
  if (team) {
    const stripped = summary.replace(new RegExp(team.name, "ig"), "").replace(/\b(varsity|junior varsity|jv|middle school|middle|ms)\b/gi, "").replace(/\s+/g, " ").trim();
    if (stripped.length >= 2) {
      return stripped;
    }
  }
  return summary.trim() || "Opponent";
}

/** Parses VEVENT blocks into raw events. */
export function parseIcsEvents(ics: string): RawEvent[] {
  const lines = unfoldIcs(ics);
  const events: RawEvent[] = [];
  let current: Record<string, string> | null = null;
  for (const line of lines) {
    if (line === "BEGIN:VEVENT") {
      current = {};
      continue;
    }
    if (line === "END:VEVENT" && current) {
      const summary = current.SUMMARY ?? "";
      const haystack = [current.SUMMARY, current.DESCRIPTION, current.CATEGORIES, current.LOCATION]
        .filter(Boolean)
        .join(" ");
      const startProp = Object.keys(current).find((key) => key.startsWith("DTSTART")) ?? "DTSTART";
      events.push({
        uid: current.UID ?? `generated-${events.length}`,
        scheduledAt: current[startProp] ? parseIcalDateTime(startProp, current[startProp]) : null,
        haystack,
        summary,
      });
      current = null;
      continue;
    }
    if (!current || !line.includes(":")) {
      continue;
    }
    const colon = line.indexOf(":");
    const name = line.slice(0, colon);
    const value = line.slice(colon + 1).replace(/\\n/g, " ").replace(/\\,/g, ",").replace(/\\;/g, ";");
    current[name] = value;
    const bare = name.split(";")[0];
    if (bare && bare !== name) {
      current[bare] = value;
    }
  }
  return events;
}

/** Maps parsed events onto club teams for the review table. */
export function mapImportEvents(ics: string, teams: ImportTeam[]): CalendarImportEvent[] {
  return parseIcsEvents(ics).map((event) => {
    const suggestedTeamId = matchTeamId(teams, event.haystack);
    const suggestedOpponent = opponentFromSummary(event.summary || event.haystack, teams, suggestedTeamId);
    const scheduledAt = event.scheduledAt ? event.scheduledAt.toISOString() : null;
    return {
      uid: event.uid,
      scheduledAt,
      summary: event.summary || event.haystack,
      suggestedTeamId,
      suggestedOpponent,
      unmatched: !suggestedTeamId || !scheduledAt,
    };
  });
}

/** Rejects private/loopback hosts so ICS fetch cannot be used as SSRF. */
export function assertSafeCalendarUrl(raw: string): URL {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new BadRequestException("Calendar URL is not valid");
  }
  if (url.protocol !== "https:") {
    throw new BadRequestException("Calendar URL must be https");
  }
  if (url.username || url.password) {
    throw new BadRequestException("Calendar URL must not include credentials");
  }
  const host = url.hostname.toLowerCase();
  if (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "::1" ||
    host === "0.0.0.0" ||
    host.endsWith(".local") ||
    host.endsWith(".internal")
  ) {
    throw new BadRequestException("Calendar URL host is not allowed");
  }
  if (/^\d+\.\d+\.\d+\.\d+$/.test(host)) {
    const [a, b] = host.split(".").map(Number);
    if (a === 10 || a === 127 || (a === 192 && b === 168) || (a === 172 && b >= 16 && b <= 31) || a === 169) {
      throw new BadRequestException("Calendar URL host is not allowed");
    }
  }
  return url;
}

/** Fetches a remote ICS with size and time limits. */
export async function fetchIcs(url: URL): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_MS);
  try {
    const res = await fetch(url, { signal: controller.signal, redirect: "error" });
    if (!res.ok) {
      throw new BadRequestException("Could not fetch the calendar URL");
    }
    const buffer = Buffer.from(await res.arrayBuffer());
    if (buffer.length > MAX_ICS_BYTES) {
      throw new BadRequestException("Calendar file is too large");
    }
    return buffer.toString("utf8");
  } catch (err) {
    if (err instanceof BadRequestException) {
      throw err;
    }
    throw new BadRequestException("Could not fetch the calendar URL");
  } finally {
    clearTimeout(timer);
  }
}
