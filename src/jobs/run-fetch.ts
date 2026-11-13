// Runs every data source once and saves what it finds.
// Add a new source by adding one line to SOURCES.

import { notInArray } from "drizzle-orm";
import type { Db } from "@/db/client";
import { deals } from "@/db/schema";
import { fetchDealNewsDeals } from "@/sources/dealnews";
import type { SourceDeal } from "@/sources/types";
import { saveDeals, type SaveResult } from "./save-deals";

const SOURCES: Record<string, () => Promise<SourceDeal[]>> = {
  dealnews: fetchDealNewsDeals,
};

export type FetchReport = Record<string, SaveResult | { error: string }>;

export async function runFetch(db: Db): Promise<FetchReport> {
  const report: FetchReport = {};
  // Deals from a source we no longer use are removed, so nothing is left behind.
  await db.delete(deals).where(notInArray(deals.source, Object.keys(SOURCES)));
  for (const [name, fetchDeals] of Object.entries(SOURCES)) {
    try {
      const found = await fetchDeals();
      report[name] = await saveDeals(db, found, new Date());
    } catch (err) {
      // One broken source must not stop the others.
      report[name] = { error: err instanceof Error ? err.message : String(err) };
    }
  }
  return report;
}
