import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const pipelineLogsTable = pgTable("pipeline_logs", {
  id: serial("id").primaryKey(),
  level: text("level").notNull().default("info"),
  message: text("message").notNull(),
  details: text("details"),
  episodeId: integer("episode_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertPipelineLogSchema = createInsertSchema(pipelineLogsTable).omit({ id: true, createdAt: true });
export type InsertPipelineLog = z.infer<typeof insertPipelineLogSchema>;
export type PipelineLog = typeof pipelineLogsTable.$inferSelect;
