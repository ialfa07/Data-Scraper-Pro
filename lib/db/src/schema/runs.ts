import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const pipelineRunsTable = pgTable("pipeline_runs", {
  id: serial("id").primaryKey(),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  endedAt: timestamp("ended_at", { withTimezone: true }),
  episodesFound: integer("episodes_found").notNull().default(0),
  episodesDownloaded: integer("episodes_downloaded").notNull().default(0),
  episodesFailed: integer("episodes_failed").notNull().default(0),
  status: text("status").notNull().default("running"),
  trigger: text("trigger").notNull().default("manual"),
  durationSeconds: integer("duration_seconds"),
});

export const insertPipelineRunSchema = createInsertSchema(pipelineRunsTable).omit({ id: true });
export type InsertPipelineRun = z.infer<typeof insertPipelineRunSchema>;
export type PipelineRun = typeof pipelineRunsTable.$inferSelect;
