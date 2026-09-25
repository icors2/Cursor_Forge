/**
 * Root module — wires Prisma, season context, auth, and every domain plugin.
 */

import { Module } from "@nestjs/common";
import { AnnouncementsModule } from "./announcements/announcements.module";
import { AuthModule } from "./auth/auth.module";
import { CalendarModule } from "./calendar/calendar.module";
import { CommonModule } from "./common/common.module";
import { GamesModule } from "./games/games.module";
import { HealthController } from "./health.controller";
import { NotesModule } from "./notes/notes.module";
import { PrismaModule } from "./prisma/prisma.module";
import { RegistrationsModule } from "./registrations/registrations.module";
import { SeasonsModule } from "./seasons/seasons.module";
import { StatsModule } from "./stats/stats.module";
import { TeamsModule } from "./teams/teams.module";
import { UsersModule } from "./users/users.module";
import { VolunteeringModule } from "./volunteering/volunteering.module";

/** Application composition root. */
@Module({
  imports: [
    PrismaModule,
    CommonModule,
    AuthModule,
    GamesModule,
    StatsModule,
    VolunteeringModule,
    CalendarModule,
    AnnouncementsModule,
    NotesModule,
    RegistrationsModule,
    SeasonsModule,
    TeamsModule,
    UsersModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
