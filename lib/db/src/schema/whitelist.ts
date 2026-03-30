import { pgTable, text, serial, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const animeWhitelistTable = pgTable("anime_whitelist", {
  id: serial("id").primaryKey(),
  animeName: text("anime_name").notNull().unique(),
  priority: integer("priority").notNull().default(0),
  qualityPreference: text("quality_preference").notNull().default("best"),
  enabled: boolean("enabled").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertAnimeWhitelistSchema = createInsertSchema(animeWhitelistTable).omit({ id: true, createdAt: true });
export type InsertAnimeWhitelist = z.infer<typeof insertAnimeWhitelistSchema>;
export type AnimeWhitelist = typeof animeWhitelistTable.$inferSelect;
