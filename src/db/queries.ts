// Questions we ask the database for the main screen.

import { and, asc, count, desc, eq, gt, gte, ilike, inArray, isNull, lte, or, sql, type SQL } from "drizzle-orm";
import type { Filters } from "@/lib/deal-filters";
import type { Db } from "./client";
import { deals, type DealRow } from "./schema";

/** Percent off, worked out by the database. 0 when there is no real "was" price. */
const pctOff = sql<number>`case when ${deals.listPriceCents} > ${deals.priceCents}
  then round(100.0 * (${deals.listPriceCents} - ${deals.priceCents}) / ${deals.listPriceCents})
  else 0 end`;

/** Dollars saved (in cents). 0 when there is no real "was" price. */
const savedCents = sql<number>`greatest(coalesce(${deals.listPriceCents}, 0) - ${deals.priceCents}, 0)`;

export const PAGE_LIMIT = 300;

function whereFor(f: Filters, now: Date): SQL | undefined {
  // Deals whose end date has passed are hidden everywhere.
  const parts: SQL[] = [or(isNull(deals.expiresAt), gt(deals.expiresAt, now))!];
  if (f.q) {
    // Escape % and _ so they are searched as plain characters.
    const safe = f.q.replace(/[\\%_]/g, (c) => `\\${c}`);
    parts.push(ilike(deals.title, `%${safe}%`));
  }
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
