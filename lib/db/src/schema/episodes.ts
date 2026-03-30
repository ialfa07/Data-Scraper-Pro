import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const episodesTable = pgTable("episodes", {
  id: serial("id").primaryKey(),
  animeName: text("anime_name").notNull(),
  season: integer("season").notNull().default(1),
  episode: integer("episode").notNull(),
  sourceUrl: text("source_url").notNull().unique(),
  videoUrl: text("video_url"),
  status: text("status").notNull().default("pending"),
  errorMessage: text("error_message"),
  filePath: text("file_path"),
  telegramMessageId: text("telegram_message_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertEpisodeSchema = createInsertSchema(episodesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertEpisode = z.infer<typeof insertEpisodeSchema>;
export type Episode = typeof episodesTable.$inferSelect;
