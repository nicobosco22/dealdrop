// The database tables. Drizzle turns this file into SQL (see the drizzle/ folder).

import { index, integer, jsonb, pgTable, serial, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
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

export type DealRow = typeof deals.$inferSelect;
