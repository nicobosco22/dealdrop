// Re-checks every saved deal against the current sorting rules.
// When the rules get better (say, spare parts stop counting as PC parts), deals saved
// under the old rules are moved to the right place, or removed if they no longer belong.

import { eq } from "drizzle-orm";
import type { Db } from "@/db/client";
import { deals } from "@/db/schema";
import { sortProduct } from "@/lib/sort-product";

/** Deal headlines often end in " for $60 + free shipping". The product name is the part before it. */
export function productNameFrom(title: string): string {
  return /^(.+) for \$[\d,]+(?:\.\d{2})?(?: \+ .*)?$/.exec(title)?.[1] ?? title;
}

export type ResortReport = { moved: number; removed: number };

export async function resortDeals(db: Db): Promise<ResortReport> {
  const report: ResortReport = { moved: 0, removed: 0 };
  const rows = await db
    .select({ id: deals.id, title: deals.title, brand: deals.brand, category: deals.category, subcategory: deals.subcategory })
    .from(deals);

  for (const row of rows) {
    const sorted = sortProduct({ title: productNameFrom(row.title), brand: row.brand });
    if (!sorted) {
      await db.delete(deals).where(eq(deals.id, row.id));
      report.removed++;
    } else if (sorted.category !== row.category || sorted.subcategory !== row.subcategory) {
      await db
        .update(deals)
        .set({ category: sorted.category, subcategory: sorted.subcategory, specs: sorted.specs })
        .where(eq(deals.id, row.id));
      report.moved++;
    }
  }
  return report;
}
