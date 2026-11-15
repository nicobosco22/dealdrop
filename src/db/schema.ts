// The database tables. Drizzle turns this file into SQL (see the drizzle/ folder).

import { boolean, index, integer, jsonb, pgTable, serial, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import type { Insights } from "@/lib/insights";
import type { Specs } from "@/lib/specs";

/** One row per deal from one source. */
export const deals = pgTable(
  "deals",
  {
    id: serial("id").primaryKey(),
    source: text("source").notNull(),
    sourceId: text("source_id").notNull(),
    title: text("title").notNull(),
    brand: text("brand"),
    specs: jsonb("specs").$type<Specs>(),
    store: text("store").notNull(),
    category: text("category").notNull(),
    subcategory: text("subcategory"),
    priceCents: integer("price_cents").notNull(),
    listPriceCents: integer("list_price_cents"),
    insights: jsonb("insights").$type<Insights>(),
    /** The deal score, 0 to 100 (see src/lib/score.ts). Worked out each time the deal is saved. */
    score: integer("score").notNull().default(0),
    /** The "real deal" check result: all-time-low, below-average, inflated, or empty. */
    verdict: text("verdict"),
    /** You saved this deal with the heart button. */
    favorite: boolean("favorite").notNull().default(false),
    url: text("url").notNull(),
    imageUrl: text("image_url"),
    sourceUpdatedAt: timestamp("source_updated_at", { withTimezone: true }),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    firstSeenAt: timestamp("first_seen_at", { withTimezone: true }).notNull().defaultNow(),
    /** The last time we looked at this deal and confirmed its price. */
    lastCheckedAt: timestamp("last_checked_at", { withTimezone: true }).notNull(),
  },
  (t) => [
    // The same deal from the same source is updated, never added twice.
    uniqueIndex("deals_source_source_id").on(t.source, t.sourceId),
    index("deals_last_checked").on(t.lastCheckedAt),
    index("deals_score").on(t.score),
  ],
);

/** Price history: a new row each time a deal's price changes. */
export const pricePoints = pgTable(
  "price_points",
  {
    id: serial("id").primaryKey(),
    dealId: integer("deal_id")
      .notNull()
      .references(() => deals.id, { onDelete: "cascade" }),
    priceCents: integer("price_cents").notNull(),
    seenAt: timestamp("seen_at", { withTimezone: true }).notNull(),
  },
  (t) => [index("price_points_deal").on(t.dealId, t.seenAt)],
);

/** The watchlist: words to look for, with an optional top price. */
export const watches = pgTable("watches", {
  id: serial("id").primaryKey(),
  keyword: text("keyword").notNull(),
  maxPriceCents: integer("max_price_cents"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  /** Matches first seen after this time have not been announced yet. */
  lastNotifiedAt: timestamp("last_notified_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Small app settings saved from inside DealDrop, one row per setting. */
export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});

export type DealRow = typeof deals.$inferSelect;
export type WatchRow = typeof watches.$inferSelect;
