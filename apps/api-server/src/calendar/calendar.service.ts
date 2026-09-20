/**
 * Builds a dynamic .ics feed for one team. Times stay UTC (Z suffix) with TZID=UTC.
 */

import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { escapeIcalText, foldIcalLine, toIcalUtc } from "./calendar.util";

/** Default match length when Setup.md does not specify DTEND. */
const GAME_MS = 2 * 60 * 60 * 1000;

/** Isolated calendar / iCal use-cases. */
@Injectable()
export class CalendarService {
  constructor(private readonly prisma: PrismaService) {}

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
}
