import { describe, expect, it } from "vitest";
import { parseCheapSharkDeal, type CheapSharkDeal } from "./cheapshark";
// A real response saved from the API, so the test matches what CheapShark really sends.
import fixture from "./__fixtures__/cheapshark-deals.json";

const stores = new Map([["1", "Steam"]]);
const first = fixture[0] as CheapSharkDeal;

describe("parseCheapSharkDeal", () => {
  it("turns a real CheapShark deal into our shape", () => {
    const deal = parseCheapSharkDeal(first, stores);
    expect(deal).toMatchObject({
      source: "cheapshark",
      sourceId: first.dealID,
      title: "Hand Simulator: Survival",
      store: "Steam",
      category: "technology",
      subcategory: "consoles-games",
      priceCents: 149,
      listPriceCents: 299,
    });
    expect(deal?.url).toBe(`https://www.cheapshark.com/redirect?dealID=${first.dealID}`);
    expect(deal?.sourceUpdatedAt).toEqual(new Date(first.lastChange * 1000));
  });

  it("skips a deal when the price cannot be read", () => {
    expect(parseCheapSharkDeal({ ...first, salePrice: "cheap" }, stores)).toBeNull();
  });

  it("skips a deal from a store we do not know", () => {
    expect(parseCheapSharkDeal({ ...first, storeID: "999" }, stores)).toBeNull();
  });

  it("skips a deal with no id, because then there is no link", () => {
    expect(parseCheapSharkDeal({ ...first, dealID: "" }, stores)).toBeNull();
  });

  it("keeps the deal but drops a bad list price", () => {
    const deal = parseCheapSharkDeal({ ...first, normalPrice: "" }, stores);
    expect(deal?.priceCents).toBe(149);
    expect(deal?.listPriceCents).toBeNull();
  });
});
