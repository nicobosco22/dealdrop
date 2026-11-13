// Questions we ask the database for the main screen.

import { and, asc, count, desc, eq, gt, gte, ilike, inArray, isNull, lte, or, sql, type SQL } from "drizzle-orm";
import type { Filters } from "@/lib/deal-filters";
import type { Db } from "./client";
import { deals, watches, type DealRow, type WatchRow } from "./schema";

/** Percent off, worked out by the database. 0 when there is no real "was" price. */
const pctOff = sql<number>`case when ${deals.listPriceCents} > ${deals.priceCents}
  then round(100.0 * (${deals.listPriceCents} - ${deals.priceCents}) / ${deals.listPriceCents})
  else 0 end`;

/** Dollars saved (in cents). 0 when there is no real "was" price. */
const savedCents = sql<number>`greatest(coalesce(${deals.listPriceCents}, 0) - ${deals.priceCents}, 0)`;

export const PAGE_LIMIT = 300;

/**
 * Search rule: every word must appear somewhere in the title, in any order.
 * So "oled monitor" finds "Samsung 27-inch OLED Gaming Monitor".
 */
export function titleHasWords(text: string): SQL[] {
  return text
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 8)
    .map((word) => {
      // Escape % and _ so they are searched as plain characters.
      const safe = word.replace(/[\\%_]/g, (c) => `\\${c}`);
      return ilike(deals.title, `%${safe}%`);
    });
}

/** True for deals that have not ended. */
export function notEnded(now: Date): SQL {
  return or(isNull(deals.expiresAt), gt(deals.expiresAt, now))!;
}

function whereFor(f: Filters, now: Date): SQL | undefined {
  // Deals whose end date has passed are hidden everywhere.
  const parts: SQL[] = [or(isNull(deals.expiresAt), gt(deals.expiresAt, now))!];
  parts.push(...titleHasWords(f.q));
  if (f.favorites) parts.push(eq(deals.favorite, true));
  if (f.category) parts.push(eq(deals.category, f.category));
  if (f.subcategory) parts.push(eq(deals.subcategory, f.subcategory));
  if (f.stores.length) parts.push(inArray(deals.store, f.stores));
  if (f.minCents !== null) parts.push(gte(deals.priceCents, f.minCents));
  if (f.maxCents !== null) parts.push(lte(deals.priceCents, f.maxCents));
  if (f.minOff !== null) parts.push(sql`${pctOff} >= ${f.minOff}`);
  // Spec filters look inside the saved specs. A deal with that spec missing does not match.
  if (f.resolution) parts.push(sql`${deals.specs}->>'resolution' = ${f.resolution}`);
  if (f.panel) parts.push(sql`${deals.specs}->>'panel' = ${f.panel}`);
  if (f.connection) parts.push(sql`${deals.specs}->>'connection' = ${f.connection}`);
  if (f.minHz !== null) parts.push(sql`(${deals.specs}->>'refreshHz')::numeric >= ${f.minHz}`);
  if (f.minSize !== null) parts.push(sql`(${deals.specs}->>'sizeInches')::numeric >= ${f.minSize}`);
  if (f.minVram !== null) parts.push(sql`(${deals.specs}->>'vramGb')::numeric >= ${f.minVram}`);
  return parts.length ? and(...parts) : undefined;
}

export async function listDeals(
  db: Db,
  f: Filters,
  now: Date = new Date(),
): Promise<{ rows: DealRow[]; total: number }> {
  const where = whereFor(f, now);
  const column = {
    best: deals.score,
    newest: sql`coalesce(${deals.sourceUpdatedAt}, ${deals.firstSeenAt})`,
    price: deals.priceCents,
    off: pctOff,
    saved: savedCents,
    title: sql`lower(${deals.title})`,
    store: sql`lower(${deals.store})`,
  }[f.sort];
  const order = f.dir === "asc" ? asc(column) : desc(column);

  const rows = await db.select().from(deals).where(where).orderBy(order, asc(deals.id)).limit(PAGE_LIMIT);
  const [{ total }] = await db.select({ total: count() }).from(deals).where(where);
  return { rows, total };
}

export type Facets = {
  stores: { name: string; count: number }[];
  categories: Record<string, number>;
  subcategories: Record<string, number>;
  /** The newest "last checked" time of any deal, or null if there are none. */
  lastCheckedAt: Date | null;
};

/** The choices to show in the filter sidebar, with how many deals each has. */
export async function getFacets(db: Db): Promise<Facets> {
  const stores = await db
    .select({ name: deals.store, count: count() })
    .from(deals)
    .groupBy(deals.store)
    .orderBy(desc(count()), asc(deals.store));
  const cats = await db
    .select({ category: deals.category, subcategory: deals.subcategory, count: count() })
    .from(deals)
    .groupBy(deals.category, deals.subcategory);
  const [latest] = await db.select({ at: sql<Date | null>`max(${deals.lastCheckedAt})` }).from(deals);

  const categories: Record<string, number> = {};
  const subcategories: Record<string, number> = {};
  for (const row of cats) {
    categories[row.category] = (categories[row.category] ?? 0) + row.count;
    if (row.subcategory) subcategories[row.subcategory] = (subcategories[row.subcategory] ?? 0) + row.count;
  }
  return { stores, categories, subcategories, lastCheckedAt: latest?.at ? new Date(latest.at) : null };
}

export type Stats = { live: number; stores: number; bestOff: number; newToday: number; saved: number };

/** The headline numbers at the top of the home page. Ended deals are not counted. */
export async function getStats(db: Db, now: Date = new Date()): Promise<Stats> {
  const dayAgo = new Date(now.getTime() - 24 * 3600 * 1000);
  const [row] = await db
    .select({
      live: count(),
      stores: sql<number>`count(distinct ${deals.store})`,
      bestOff: sql<number>`coalesce(max(${pctOff}), 0)`,
      newToday: sql<number>`count(*) filter (where ${deals.firstSeenAt} > ${dayAgo})`,
      saved: sql<number>`count(*) filter (where ${deals.favorite})`,
    })
    .from(deals)
    .where(or(isNull(deals.expiresAt), gt(deals.expiresAt, now)));
  return {
    live: Number(row.live),
    stores: Number(row.stores),
    bestOff: Number(row.bestOff),
    newToday: Number(row.newToday),
    saved: Number(row.saved),
  };
}

/** The biggest real markdowns right now, for the "Top drops" row. */
export async function getTopDrops(db: Db, limit: number, now: Date = new Date()): Promise<DealRow[]> {
  return db
    .select()
    .from(deals)
    .where(and(or(isNull(deals.expiresAt), gt(deals.expiresAt, now)), sql`${pctOff} > 0`))
    .orderBy(desc(pctOff), desc(savedCents), asc(deals.id))
    .limit(limit);
}

export type WatchWithMatches = WatchRow & { matchCount: number; newCount: number; top: DealRow[] };

/** The rule for "this deal matches this watch": all the words, under the top price, not ended. */
export function watchWhere(watch: Pick<WatchRow, "keyword" | "maxPriceCents">, now: Date): SQL {
  const parts = [notEnded(now), ...titleHasWords(watch.keyword)];
  if (watch.maxPriceCents !== null) parts.push(lte(deals.priceCents, watch.maxPriceCents));
  return and(...parts)!;
}

/** Every watch, with how many deals match, how many are new in the last day, and the best three. */
export async function listWatches(db: Db, now: Date = new Date()): Promise<WatchWithMatches[]> {
  const dayAgo = new Date(now.getTime() - 24 * 3600 * 1000);
  const all = await db.select().from(watches).orderBy(asc(watches.createdAt), asc(watches.id));
  const result: WatchWithMatches[] = [];
  for (const watch of all) {
    const where = watchWhere(watch, now);
    const [counts] = await db
      .select({
        matchCount: count(),
        newCount: sql<number>`count(*) filter (where ${deals.firstSeenAt} > ${dayAgo})`,
      })
      .from(deals)
      .where(where);
    const top = await db.select().from(deals).where(where).orderBy(desc(deals.score), asc(deals.priceCents)).limit(3);
    result.push({ ...watch, matchCount: Number(counts.matchCount), newCount: Number(counts.newCount), top });
  }
  return result;
}
