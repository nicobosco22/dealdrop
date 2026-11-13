import { describe, expect, it } from "vitest";
import { activeFilterCount, hrefWith, parseFilters } from "./deal-filters";

describe("parseFilters", () => {
  it("gives safe defaults for an empty address", () => {
    expect(parseFilters({})).toEqual({
      q: "",
      category: null,
      subcategory: null,
      stores: [],
      minCents: null,
      maxCents: null,
      minOff: null,
      favorites: false,
      resolution: null,
      panel: null,
      minHz: null,
      minSize: null,
      connection: null,
      minVram: null,
      sort: "best",
      dir: "desc",
      view: "table",
    });
  });

  it("reads every filter", () => {
    const f = parseFilters({
      q: " oled ",
      cat: "technology",
      sub: "monitors",
      store: ["Steam", "GOG", "Steam"],
      min: "10",
      max: "$1,299.99",
      off: "25",
      sort: "price",
      view: "cards",
    });
    expect(f).toMatchObject({
      q: "oled",
      category: "technology",
      subcategory: "monitors",
      stores: ["Steam", "GOG"],
      minCents: 1000,
      maxCents: 129999,
      minOff: 25,
      sort: "price",
      dir: "asc",
      view: "cards",
    });
  });

  it("ignores values it does not know", () => {
    const f = parseFilters({ cat: "toys", sub: "monitors", sort: "random", dir: "up", off: "150", min: "abc" });
    expect(f.category).toBeNull();
    expect(f.subcategory).toBeNull();
    expect(f.sort).toBe("best");
    expect(f.dir).toBe("desc");
    expect(f.minOff).toBeNull();
    expect(f.minCents).toBeNull();
  });

  it("only allows a subcategory inside Technology", () => {
    expect(parseFilters({ cat: "lego", sub: "monitors" }).subcategory).toBeNull();
  });

  it("swaps a backwards price range", () => {
    const f = parseFilters({ min: "50", max: "20" });
    expect([f.minCents, f.maxCents]).toEqual([2000, 5000]);
  });

  it("uses each sort's natural direction unless told otherwise", () => {
    expect(parseFilters({ sort: "off" }).dir).toBe("desc");
    expect(parseFilters({ sort: "title" }).dir).toBe("asc");
    expect(parseFilters({ sort: "price", dir: "desc" }).dir).toBe("desc");
  });
});

describe("favorites filter", () => {
  it("is on only for fav=1", () => {
    expect(parseFilters({ fav: "1" }).favorites).toBe(true);
    expect(parseFilters({ fav: "yes" }).favorites).toBe(false);
    expect(activeFilterCount(parseFilters({ fav: "1" }))).toBe(1);
  });
});

describe("spec filters", () => {
  it("reads monitor specs only inside Monitors", () => {
    const raw = { cat: "technology", sub: "monitors", res: "4K", panel: "OLED", hz: "144", size: "27" };
    expect(parseFilters(raw)).toMatchObject({ resolution: "4K", panel: "OLED", minHz: 144, minSize: 27 });
    expect(parseFilters({ ...raw, sub: "audio" })).toMatchObject({
      resolution: null,
      panel: null,
      minHz: null,
      minSize: null,
    });
  });

  it("reads wired/wireless only inside Gaming gear, and graphics memory only inside PC parts", () => {
    expect(parseFilters({ cat: "technology", sub: "gaming-gear", conn: "wireless" }).connection).toBe("wireless");
    expect(parseFilters({ cat: "technology", sub: "pc-parts", vram: "12" }).minVram).toBe(12);
    expect(parseFilters({ cat: "technology", sub: "pc-parts", conn: "wireless" }).connection).toBeNull();
  });

  it("ignores values it does not know", () => {
    const f = parseFilters({ cat: "technology", sub: "monitors", res: "9K", panel: "plasma", hz: "fast" });
    expect(f).toMatchObject({ resolution: null, panel: null, minHz: null });
  });
});

describe("hrefWith", () => {
  it("changes one thing and keeps the rest", () => {
    expect(hrefWith({ q: "lego", store: ["Steam", "GOG"] }, { sort: "price" })).toBe(
      "/?q=lego&store=Steam&store=GOG&sort=price",
    );
  });

  it("removes a filter when given null, and drops blanks", () => {
    expect(hrefWith({ q: "", view: "cards" }, { view: null })).toBe("/");
  });
});

describe("activeFilterCount", () => {
  it("counts filters but not search or sort", () => {
    const f = parseFilters({ q: "x", sort: "price", cat: "technology", store: ["A", "B"], max: "5" });
    expect(activeFilterCount(f)).toBe(4);
  });
});
