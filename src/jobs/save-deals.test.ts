import { describe, expect, it } from "vitest";
import { openDb } from "@/db/client";
import { deals, pricePoints } from "@/db/schema";
import type { SourceDeal } from "@/sources/types";
import { saveDeals } from "./save-deals";

const sample: SourceDeal = {
  source: "test",
  sourceId: "abc",
  title: "Test Game",
  brand: null,
  specs: null,
  store: "Steam",
  category: "technology",
  subcategory: "consoles",
  priceCents: 1000,
  listPriceCents: 2000,
  url: "https://example.com/deal/abc",
  imageUrl: null,
  sourceUpdatedAt: null,
  expiresAt: null,
};

describe("saveDeals", () => {
  it("adds a new deal, then updates it without making a copy", async () => {
    const db = await openDb(); // in-memory, thrown away after the test
    const t1 = new Date("2026-11-12T10:00:00Z");
    const t2 = new Date("2026-11-12T10:10:00Z");
    const t3 = new Date("2026-11-12T10:20:00Z");

    expect(await saveDeals(db, [sample], t1)).toEqual({ added: 1, updated: 0, priceChanges: 0 });

    // Same price again: last-checked time moves, no new history row.
    expect(await saveDeals(db, [sample], t2)).toEqual({ added: 0, updated: 1, priceChanges: 0 });

    // Price drops: history gets a second row.
    expect(await saveDeals(db, [{ ...sample, priceCents: 800 }], t3)).toEqual({
      added: 0,
      updated: 1,
      priceChanges: 1,
    });

    const rows = await db.select().from(deals);
    expect(rows).toHaveLength(1);
    expect(rows[0].priceCents).toBe(800);
    expect(rows[0].url).toBe("https://example.com/deal/abc");
    expect(rows[0].firstSeenAt).toEqual(t1);
    expect(rows[0].lastCheckedAt).toEqual(t3);

    const history = await db.select().from(pricePoints).orderBy(pricePoints.seenAt);
    expect(history.map((p) => p.priceCents)).toEqual([1000, 800]);
  });
});
