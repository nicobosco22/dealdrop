import { beforeAll, describe, expect, it } from "vitest";
import { saveDeals } from "@/jobs/save-deals";
import { parseFilters, type RawParams } from "@/lib/deal-filters";
import { extractSpecs } from "@/lib/specs";
import type { SourceDeal } from "@/sources/types";
import { openDb, type Db } from "./client";
import { getFacets, listDeals } from "./queries";

function deal(id: string, over: Partial<SourceDeal>): SourceDeal {
  return {
    source: "test",
    sourceId: id,
    title: id,
    brand: null,
    specs: extractSpecs(over.subcategory ?? null, id),
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

describe("spec filters", () => {
  beforeAll(async () => {
    await saveDeals(
      db,
      [
        deal('LG 27" QHD 165Hz IPS Monitor', { subcategory: "monitors", store: "Newegg" }),
        deal('Dell 32-inch 4K 60Hz VA Monitor', { subcategory: "monitors", store: "Newegg" }),
        deal("Razer Viper Wireless Mouse 30K DPI", { subcategory: "gaming-gear", store: "Newegg" }),
        deal("Logitech G203 Wired Mouse", { subcategory: "gaming-gear", store: "Newegg" }),
        deal("MSI RTX 5070 Ti 16GB", { subcategory: "pc-parts", store: "Newegg" }),
        deal("Zotac RTX 4060 8GB", { subcategory: "pc-parts", store: "Newegg" }),
      ],
      new Date("2026-11-12T10:00:00Z"),
    );
  });
  const monitors = { cat: "technology", sub: "monitors", sort: "title" };

  it("filters monitors by resolution, panel, refresh rate and size", async () => {
    expect(await titles({ ...monitors, res: "4K" })).toEqual(["Dell 32-inch 4K 60Hz VA Monitor"]);
    expect(await titles({ ...monitors, panel: "IPS" })).toEqual(['LG 27" QHD 165Hz IPS Monitor']);
    expect(await titles({ ...monitors, hz: "144" })).toEqual(['LG 27" QHD 165Hz IPS Monitor']);
    expect(await titles({ ...monitors, size: "30" })).toEqual(["Dell 32-inch 4K 60Hz VA Monitor"]);
  });

  it("leaves out monitors whose title did not state that spec", async () => {
    // "OLED Monitor 27" from the first batch has no refresh rate in its title.
    expect(await titles({ ...monitors, hz: "60" })).not.toContain("OLED Monitor 27");
    expect(await titles({ ...monitors, panel: "OLED" })).toEqual(["OLED Monitor 27"]);
  });

  it("filters mice by wired or wireless", async () => {
    expect(await titles({ cat: "technology", sub: "gaming-gear", conn: "wireless" })).toEqual([
      "Razer Viper Wireless Mouse 30K DPI",
    ]);
  });

  it("filters graphics cards by memory", async () => {
    expect(await titles({ cat: "technology", sub: "pc-parts", vram: "12" })).toEqual(["MSI RTX 5070 Ti 16GB"]);
  });
});

describe("ended deals", () => {
  it("hides a deal once its end date has passed", async () => {
    await saveDeals(
      db,
      [deal("Flash Sale Game", { expiresAt: new Date("2026-11-20T00:00:00Z") })],
      new Date("2026-11-12T10:00:00Z"),
    );
    const at = async (when: string) =>
      (await listDeals(db, parseFilters({ q: "flash sale" }), new Date(when))).rows.length;
    expect(await at("2026-11-19T00:00:00Z")).toBe(1);
    expect(await at("2026-11-21T00:00:00Z")).toBe(0);
  });
});

describe("getFacets", () => {
  it("counts deals per store, category and subcategory", async () => {
    const facets = await getFacets(db);
    expect(facets.stores[0]).toEqual({ name: "Newegg", count: 6 });
    expect(facets.categories).toEqual({ technology: 10, lego: 1, house: 1 });
    expect(facets.subcategories).toEqual({ "consoles-games": 3, monitors: 3, "gaming-gear": 2, "pc-parts": 2 });
    expect(facets.lastCheckedAt).toEqual(new Date("2026-11-12T10:00:00Z"));
  });
});
