import { pgTable, text, serial, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const schedulerConfigTable = pgTable("scheduler_config", {
  id: serial("id").primaryKey(),
  enabled: boolean("enabled").notNull().default(false),
  intervalMinutes: integer("interval_minutes").notNull().default(60),
  lastRunAt: timestamp("last_run_at", { withTimezone: true }),
  nextRunAt: timestamp("next_run_at", { withTimezone: true }),
  discordWebhookUrl: text("discord_webhook_url"),
  notifyOnError: boolean("notify_on_error").notNull().default(true),
  defaultQuality: text("default_quality").notNull().default("best"),
  useWhitelist: boolean("use_whitelist").notNull().default(false),
});

export const insertSchedulerConfigSchema = createInsertSchema(schedulerConfigTable).omit({ id: true });
export type InsertSchedulerConfig = z.infer<typeof insertSchedulerConfigSchema>;
export type SchedulerConfig = typeof schedulerConfigTable.$inferSelect;
