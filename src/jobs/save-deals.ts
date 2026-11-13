// Saves fetched deals into the database.
// New deal -> add it. Seen before -> update it. Price changed -> add a history row.

import { and, eq } from "drizzle-orm";
import type { Db } from "@/db/client";
import { deals, pricePoints } from "@/db/schema";
import type { SourceDeal } from "@/sources/types";

export type SaveResult = { added: number; updated: number; priceChanges: number };

export async function saveDeals(db: Db, incoming: SourceDeal[], checkedAt: Date): Promise<SaveResult> {
  const result: SaveResult = { added: 0, updated: 0, priceChanges: 0 };

  for (const deal of incoming) {
    const [existing] = await db
      .select({ id: deals.id, priceCents: deals.priceCents })
      .from(deals)
      .where(and(eq(deals.source, deal.source), eq(deals.sourceId, deal.sourceId)));

    if (!existing) {
      const [row] = await db
        .insert(deals)
        .values({ ...deal, firstSeenAt: checkedAt, lastCheckedAt: checkedAt })
        .returning({ id: deals.id });
      await db.insert(pricePoints).values({ dealId: row.id, priceCents: deal.priceCents, seenAt: checkedAt });
      result.added++;
      continue;
    }

    await db
      .update(deals)
      .set({ ...deal, lastCheckedAt: checkedAt })
      .where(eq(deals.id, existing.id));
    result.updated++;

    if (existing.priceCents !== deal.priceCents) {
      await db.insert(pricePoints).values({ dealId: existing.id, priceCents: deal.priceCents, seenAt: checkedAt });
      result.priceChanges++;
    }
  }

  return result;
}
