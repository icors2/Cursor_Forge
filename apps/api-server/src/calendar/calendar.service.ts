/**
 * Builds a dynamic .ics feed for one team and imports an external multi-team ICS.
 */

import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import type {
  CalendarImportCommitResult,
  CalendarImportPreview,
  CalendarSubscriptionView,
  GameSummary,
} from "@volleyball-manager/shared-types";
import type { RequestUser } from "../auth/auth.types";
import { ActiveSeasonService } from "../common/active-season.service";
import { PrismaService } from "../prisma/prisma.service";
import type { CalendarCommitDto, CalendarPreviewDto } from "./calendar.dto";
import { assertSafeCalendarUrl, fetchIcs, mapImportEvents } from "./calendar.import";
import { escapeIcalText, foldIcalLine, toIcalUtc } from "./calendar.util";

/** Default match length when Setup.md does not specify DTEND. */
const GAME_MS = 2 * 60 * 60 * 1000;

/** Isolated calendar / iCal use-cases. */
@Injectable()
export class CalendarService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly seasons: ActiveSeasonService,
  ) {}

  /** Last remembered club ICS URL. Always JSON so the browser helper can parse the body. */
  async lastSubscription(): Promise<CalendarSubscriptionView> {
    const row = await this.prisma.calendarSubscription.findFirst({ orderBy: { createdAt: "desc" } });
    if (!row) {
      return { id: null, url: null, createdById: null, createdAt: null };
    }
    return {
      id: row.id,
      url: row.url,
      createdById: row.createdById,
      createdAt: row.createdAt.toISOString(),
    };
  }

  /**
   * Returns text/calendar for every game on the team.
   * The team is already season-scoped, so the feed does not mix seasons.
   */
  async buildTeamFeed(teamId: string): Promise<string> {
    const team = await this.prisma.team.findUnique({
      where: { id: teamId },
      include: {
        season: true,
        games: { orderBy: { scheduledAt: "asc" } },
      },
    });
    if (!team) {
      throw new NotFoundException("Team not found");
    }

    const now = toIcalUtc(new Date());
    const lines: string[] = [
      "BEGIN:VCALENDAR",
      "PRODID:-//Volleyball Manager//EN",
      "VERSION:2.0",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      "X-WR-TIMEZONE:UTC",
      `X-WR-CALNAME:${escapeIcalText(`${team.name} ${team.season.name}`)}`,
      "BEGIN:VTIMEZONE",
      "TZID:UTC",
      "BEGIN:STANDARD",
      "DTSTART:19700101T000000Z",
      "TZOFFSETFROM:+0000",
      "TZOFFSETTO:+0000",
      "TZNAME:UTC",
      "END:STANDARD",
      "END:VTIMEZONE",
    ];

    for (const game of team.games) {
      const start = toIcalUtc(game.scheduledAt);
      const end = toIcalUtc(new Date(game.scheduledAt.getTime() + GAME_MS));
      const summary = escapeIcalText(`${team.name} vs ${game.opponent}`);
      lines.push("BEGIN:VEVENT");
      lines.push(`UID:game-${game.id}@volleyball-manager.local`);
      lines.push(`DTSTAMP:${now}`);
      lines.push(`DTSTART:${start}`);
      lines.push(`DTEND:${end}`);
      lines.push(foldIcalLine(`SUMMARY:${summary}`));
      lines.push(foldIcalLine(`DESCRIPTION:${escapeIcalText(`${team.season.name} · kickoff UTC`)}`));
      lines.push("END:VEVENT");
    }

    lines.push("END:VCALENDAR");
    return `${lines.join("\r\n")}\r\n`;
  }

  /** Parses an ICS URL or pasted text into review rows. Does not write games. */
  async preview(dto: CalendarPreviewDto): Promise<CalendarImportPreview> {
    const ics = await this.loadIcs(dto);
    const season = await this.seasons.getActiveSeason();
    const teams = await this.prisma.team.findMany({
      where: { seasonId: season.id },
      select: { id: true, name: true },
    });
    return {
      url: dto.url?.trim() ?? null,
      events: mapImportEvents(ics, teams),
    };
  }

  /** Upserts reviewed events as Game rows keyed by ICS UID. */
  async commit(actor: RequestUser, dto: CalendarCommitDto): Promise<CalendarImportCommitResult> {
    const season = await this.seasons.getActiveSeason();
    const teams = await this.prisma.team.findMany({ where: { seasonId: season.id } });
    const teamIds = new Set(teams.map((team) => team.id));
    const games: GameSummary[] = [];
    let skipped = 0;
    for (const event of dto.events) {
      if (!event.uid || !event.teamId || !event.opponent?.trim() || !event.scheduledAt) {
        skipped += 1;
        continue;
      }
      if (!teamIds.has(event.teamId)) {
        throw new BadRequestException("Every imported game must use an active-season team");
      }
      const kickoff = new Date(event.scheduledAt);
      if (Number.isNaN(kickoff.getTime())) {
        skipped += 1;
        continue;
      }
      const team = teams.find((row) => row.id === event.teamId);
      if (!team) {
        skipped += 1;
        continue;
      }
      const saved = await this.prisma.game.upsert({
        where: { externalUid: event.uid },
        update: {
          teamId: team.id,
          opponent: event.opponent.trim(),
          scheduledAt: kickoff,
          seasonId: season.id,
        },
        create: {
          teamId: team.id,
          opponent: event.opponent.trim(),
          scheduledAt: kickoff,
          seasonId: season.id,
          externalUid: event.uid,
        },
        include: { team: true, season: true },
      });
      games.push({
        id: saved.id,
        teamId: saved.teamId,
        teamName: saved.team.name,
        opponent: saved.opponent,
        scheduledAt: saved.scheduledAt.toISOString(),
        seasonId: saved.seasonId,
        seasonName: saved.season.name,
        seasonActive: saved.season.isActive,
      });
    }
    if (dto.url) {
      const url = assertSafeCalendarUrl(dto.url).toString();
      const existing = await this.prisma.calendarSubscription.findFirst();
      if (existing) {
        await this.prisma.calendarSubscription.update({
          where: { id: existing.id },
          data: { url, createdById: actor.id },
        });
      } else {
        await this.prisma.calendarSubscription.create({
          data: { url, createdById: actor.id },
        });
      }
    }
    return { games, skipped };
  }

  /** Loads ICS from pasted text or a safe https URL. */
  private async loadIcs(dto: CalendarPreviewDto): Promise<string> {
    if (dto.icsText?.trim()) {
      return dto.icsText;
    }
    if (!dto.url) {
      throw new BadRequestException("Provide a calendar URL or paste ICS text");
    }
    const url = assertSafeCalendarUrl(dto.url);
    return fetchIcs(url);
  }
}
