import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { parseDealNewsItem, readDealNewsFeed, type DealNewsItem } from "./dealnews";

// Real items saved from the DealNews feed (long write-ups removed).
const feed = readDealNewsFeed(readFileSync(path.join(__dirname, "__fixtures__", "dealnews.xml"), "utf8"));
const find = (text: string) => {
  const item = feed.find((i) => i.title?.includes(text));
  if (!item) throw new Error(`no fixture item with "${text}"`);
  return item;
};

describe("readDealNewsFeed", () => {
  it("reads every item", () => {
    expect(feed).toHaveLength(11);
  });

  it("returns nothing for an empty or broken feed", () => {
    expect(readDealNewsFeed("<rss><channel></channel></rss>")).toEqual([]);
    expect(readDealNewsFeed("not xml at all")).toEqual([]);
  });
});

describe("parseDealNewsItem", () => {
  it("reads a product deal: store, price, link, picture and end date", () => {
    const item = find("Apple Magic Mouse");
    const deal = parseDealNewsItem(item);
    expect(deal).toMatchObject({
      source: "dealnews",
      title: "Apple Magic Mouse for $60 + free shipping",
      store: "Amazon",
      category: "technology",
      subcategory: "gaming-gear",
      priceCents: 6000,
      listPriceCents: null,
    });
    expect(deal?.sourceId).toMatch(/^\d+$/);
    expect(deal?.imageUrl).toMatch(/^https:\/\/d\.dlnws\.com\//);
    expect(deal?.expiresAt).toBeInstanceOf(Date);
    expect(deal?.sourceUpdatedAt).toBeInstanceOf(Date);
  });

  it("keeps the title and link exactly as DealNews sent them", () => {
    const item = find("Hisense");
    const deal = parseDealNewsItem(item);
    expect(deal?.title).toBe(item.title);
    expect(deal?.url).toBe(item.link);
    expect(deal?.url).toContain("iref=rss");
  });

  it("sorts products into the right category and reads specs", () => {
    expect(parseDealNewsItem(find("Hisense"))).toMatchObject({
      category: "technology",
      subcategory: "tv-video",
      priceCents: 14800,
    });
    expect(parseDealNewsItem(find("Gourmia"))).toMatchObject({ subcategory: "appliances", store: "Costco" });
    expect(parseDealNewsItem(find("De'Longhi"))).toMatchObject({ subcategory: "appliances", priceCents: 14900 });
  });

  it("uses the last price in a title that says 'for' twice", () => {
    expect(parseDealNewsItem(find("Ocarina of Time"))).toMatchObject({
      subcategory: "consoles-games",
      priceCents: 5500,
      store: "Costco",
    });
  });

  it("skips store-wide sales, which have no single price", () => {
    expect(parseDealNewsItem(find("Birkenstock"))).toBeNull();
  });

  it("skips price ranges like 'From $249' instead of guessing", () => {
    expect(parseDealNewsItem(find("Herman Miller"))).toBeNull();
  });

  it("skips free offers and titles with no price", () => {
    expect(parseDealNewsItem(find("Amazon Music Unlimited"))).toBeNull();
  });

  it("skips products DealDrop does not track", () => {
    expect(parseDealNewsItem(find("Dumbbell Set"))).toBeNull();
    expect(parseDealNewsItem(find("Bowser Battle"))).toBeNull(); // a toy that is not LEGO
    expect(parseDealNewsItem(find("Vacuum Storage Bags"))).toBeNull(); // not a vacuum
  });

  it("skips an item with missing parts", () => {
    const good = find("Apple Magic Mouse");
    const without = (key: keyof DealNewsItem) => parseDealNewsItem({ ...good, [key]: undefined });
    expect(without("link")).toBeNull();
    expect(without("guid")).toBeNull();
    expect(without("dealnews:retailer")).toBeNull();
    expect(without("title")).toBeNull();
  });

  it("drops a date it cannot read but keeps the deal", () => {
    const deal = parseDealNewsItem({ ...find("Apple Magic Mouse"), "dealnews:expires": "soon" });
    expect(deal?.expiresAt).toBeNull();
    expect(deal?.priceCents).toBe(6000);
  });
});
