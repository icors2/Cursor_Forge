/**
 * Isolated coach-notes plugin. Does not import announcements or stats.
 */

import { Module } from "@nestjs/common";
import { NotesController } from "./notes.controller";
import { NotesService } from "./notes.service";

/** Registers coach-note HTTP routes. */
@Module({
  controllers: [NotesController],
  providers: [NotesService],
})
export class NotesModule {}
