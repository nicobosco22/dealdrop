import { beforeAll, describe, expect, it } from "vitest";
import { saveDeals } from "@/jobs/save-deals";
import { parseFilters, type RawParams } from "@/lib/deal-filters";
import type { SourceDeal } from "@/sources/types";
import { openDb, type Db } from "./client";
import { getFacets, listDeals } from "./queries";

function deal(id: string, over: Partial<SourceDeal>): SourceDeal {
  return {
    source: "test",
    sourceId: id,
    title: id,
    store: "Steam",
    category: "technology",
    subcategory: "consoles-games",
    priceCents: 1000,
    listPriceCents: 2000,
    url: `https://example.com/${id}`,
    imageUrl: null,
    sourceUpdatedAt: null,
    expiresAt: null,
    ...over,
  };
}

let db: Db;
const titles = async (raw: RawParams) => (await listDeals(db, parseFilters(raw))).rows.map((r) => r.title);

beforeAll(async () => {
  db = await openDb();
  await saveDeals(
    db,
    [
      deal("Alpha Game", { priceCents: 500, listPriceCents: 2000, sourceUpdatedAt: new Date("2026-11-01") }),
      deal("Beta Game", { priceCents: 1500, listPriceCents: 2000, store: "GOG", sourceUpdatedAt: new Date("2026-11-03") }),
      deal("OLED Monitor 27", { priceCents: 60000, listPriceCents: 90000, store: "Best Buy", subcategory: "monitors", sourceUpdatedAt: new Date("2026-11-02") }),
      deal("LEGO Star Wars X-Wing", { priceCents: 4000, listPriceCents: null, store: "Target", category: "lego", subcategory: null, sourceUpdatedAt: new Date("2026-11-04") }),
      deal("100% Cotton_Towels", { priceCents: 2500, listPriceCents: 2500, store: "Target", category: "house", subcategory: null, sourceUpdatedAt: new Date("2026-11-05") }),
    ],
    new Date("2026-11-12T10:00:00Z"),
  );
});

describe("listDeals", () => {
  it("shows newest first by default", async () => {
    expect((await titles({}))[0]).toBe("100% Cotton_Towels");
  });

  it("filters by category and subcategory", async () => {
    expect(await titles({ cat: "lego" })).toEqual(["LEGO Star Wars X-Wing"]);
    expect(await titles({ cat: "technology", sub: "monitors" })).toEqual(["OLED Monitor 27"]);
  });

  it("filters by store, more than one at once", async () => {
    expect((await titles({ store: ["GOG", "Best Buy"], sort: "title" }))).toEqual(["Beta Game", "OLED Monitor 27"]);
  });

  it("filters by price range", async () => {
    expect(await titles({ min: "10", max: "40", sort: "price" })).toEqual([
      "Beta Game",
      "100% Cotton_Towels",
      "LEGO Star Wars X-Wing",
    ]);
  });

  it("filters by percent off, and deals with no real markdown never pass", async () => {
    expect(await titles({ off: "30", sort: "off" })).toEqual(["Alpha Game", "OLED Monitor 27"]);
  });

  it("searches titles without caring about capitals", async () => {
    expect(await titles({ q: "oled" })).toEqual(["OLED Monitor 27"]);
  });

  it("treats % and _ in a search as plain characters", async () => {
    expect(await titles({ q: "100%" })).toEqual(["100% Cotton_Towels"]);
    expect(await titles({ q: "n_t" })).toEqual(["100% Cotton_Towels"]);
  });

  it("sorts by biggest dollar saving", async () => {
    expect((await titles({ sort: "saved" }))[0]).toBe("OLED Monitor 27");
  });

  it("reports the total that match", async () => {
    expect((await listDeals(db, parseFilters({ cat: "technology" }))).total).toBe(3);
  });
});

describe("getFacets", () => {
  it("counts deals per store, category and subcategory", async () => {
    const facets = await getFacets(db);
    expect(facets.stores[0]).toEqual({ name: "Target", count: 2 });
    expect(facets.categories).toEqual({ technology: 3, lego: 1, house: 1 });
    expect(facets.subcategories).toEqual({ "consoles-games": 2, monitors: 1 });
    expect(facets.lastCheckedAt).toEqual(new Date("2026-11-12T10:00:00Z"));
  });
});
