import { describe, expect, it } from "vitest";
import { openDb } from "@/db/client";
import { deals } from "@/db/schema";
import type { SourceDeal } from "@/sources/types";
import { productNameFrom, resortDeals } from "./resort";
import { saveDeals } from "./save-deals";

function deal(title: string, subcategory: string | null, category: SourceDeal["category"] = "technology"): SourceDeal {
  return {
    source: "test",
    sourceId: title,
    title,
    brand: null,
    specs: null,
    store: "Newegg",
    category,
    subcategory,
    priceCents: 1000,
    listPriceCents: null,
    insights: null,
    url: "https://example.com/x",
    imageUrl: null,
    sourceUpdatedAt: null,
    expiresAt: null,
  };
}

describe("productNameFrom", () => {
  it("drops the price ending of a deal headline", () => {
    expect(productNameFrom("Apple Magic Mouse for $60 + free shipping")).toBe("Apple Magic Mouse");
    expect(productNameFrom("Zelda for Nintendo Switch 2 for $55")).toBe("Zelda for Nintendo Switch 2");
    expect(productNameFrom("Plain Product Name")).toBe("Plain Product Name");
  });
});

describe("resortDeals", () => {
  it("moves misfiled deals, removes ones that no longer belong, and leaves the rest", async () => {
    const db = await openDb();
    await saveDeals(
      db,
      [
        // Saved under old rules as a PC part; it is a spare fan, so it should go.
        deal("GTX 1060 ITX Graphics Card Cooler Radiator for $12 + free shipping", "pc-parts"),
        // Saved as gaming gear; it is a console.
        deal("PlayStation 5 Digital Edition Console for $399 + free shipping", "gaming-gear"),
        // Already right.
        deal("Logitech G309 Lightspeed Wireless Gaming Mouse for $50 + free shipping", "gaming-gear"),
      ],
      new Date("2026-11-12T10:00:00Z"),
    );

    expect(await resortDeals(db)).toEqual({ moved: 1, removed: 1 });

    const rows = await db.select().from(deals).orderBy(deals.title);
    expect(rows.map((r) => [r.title.slice(0, 13), r.subcategory])).toEqual([
      ["Logitech G309", "gaming-gear"],
      ["PlayStation 5", "consoles"],
    ]);
    // Running it again changes nothing.
    expect(await resortDeals(db)).toEqual({ moved: 0, removed: 0 });
  });
});
