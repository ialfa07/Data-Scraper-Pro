import { pgTable, text, serial, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const animeSitesTable = pgTable("anime_sites", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  baseUrl: text("base_url").notNull(),
  enabled: boolean("enabled").notNull().default(true),
  requiresJs: boolean("requires_js").notNull().default(false),
  scraperType: text("scraper_type").notNull().default("generic"),
  lastScrapedAt: timestamp("last_scraped_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertAnimeSiteSchema = createInsertSchema(animeSitesTable).omit({ id: true, createdAt: true });
export type InsertAnimeSite = z.infer<typeof insertAnimeSiteSchema>;
export type AnimeSite = typeof animeSitesTable.$inferSelect;
