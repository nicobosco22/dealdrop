// Source: DealNews RSS feeds (https://www.dealnews.com/pages/rss.html)
// What it gives: hand-picked deals from many stores (Amazon, Costco, Lowe's, Walmart...),
// including stores that have no price API of their own.
// Cost: free, no key.
//
// Their rules, which this file follows:
//  - Do not change the feed's content, links or referral codes.
//    -> We show the title exactly as sent and link to the DealNews page exactly as sent.
//  - Credit DealNews if shown publicly. -> The page footer and source column say DealNews.
//  - robots.txt asks for 2 seconds between requests. -> See CRAWL_DELAY_MS.

import { XMLParser } from "fast-xml-parser";
import { htmlToText, readPriceFacts } from "@/lib/insights";
import { parsePriceToCents } from "@/lib/money";
import { sortProduct } from "@/lib/sort-product";
import type { SourceDeal } from "./types";

const HEADERS = { "User-Agent": "DealDrop/0.1 (personal deal tracker)" };
const CRAWL_DELAY_MS = 2000;

/** The newest deals overall, plus the sections that match DealDrop's categories. */
const SECTIONS = [
  "", // newest deals overall
  // Technology
  "c39/Computers/",
  "c49/Computers/Laptops/",
  "c48/Computers/Desktops/",
  "c75/Computers/Peripherals/Monitors/",
  "c70/Computers/Peripherals/Input-Devices/",
  "c93/Computers/Upgrades-Components/",
  "c142/Electronics/",
  "c159/Electronics/TVs/",
  "c155/Electronics/Audio-Components/Headphones/",
  "c147/Electronics/Audio-Components/Speakers/",
  "c174/Electronics/Phones-Cell-Phones/Cell-Phones/",
  "c714/Gaming-Toys/Video-Games/Consoles/",
  "c712/Gaming-Toys/Video-Games/Accessories/",
  "c304/Home-Garden/Appliances/",
  "c642/Home-Garden/Kitchen/Small-Appliances/",
  // House items and furniture
  "c196/Home-Garden/",
  "c360/Home-Garden/Bed-Bath/",
  "c201/Home-Garden/Kitchen/",
  "c200/Home-Garden/Decor/",
  // LEGO lives in the toy section; every other toy is thrown away by the sorter
  "c226/Gaming-Toys/Toys-Hobbies/",
];
export const DEALNEWS_FEEDS = SECTIONS.map((path) => `https://www.dealnews.com/${path}?rss=1`);

/** One feed item after the XML is read (only the fields we use). */
export type DealNewsItem = {
  title?: string;
  link?: string;
  guid?: string;
  pubDate?: string;
  /** The editor's write-up, as HTML. */
  description?: string;
  "dealnews:retailer"?: string;
  "dealnews:dealType"?: string;
  "dealnews:expires"?: string;
  "media:content"?: { "@_url"?: string };
};

const xml = new XMLParser({ ignoreAttributes: false, parseTagValue: false });

/** Read a DealNews feed's XML into a list of items. */
export function readDealNewsFeed(xmlText: string): DealNewsItem[] {
  const items = xml.parse(xmlText)?.rss?.channel?.item;
  if (!items) return [];
  return Array.isArray(items) ? items : [items];
}

// A single-product headline looks like "Apple Magic Mouse for $60 + free shipping".
// Store-wide sales ("Up to 40% off") and ranges ("for From $249") do not match,
// so they are skipped rather than given a made-up price.
const HEADLINE = /^(.+) for \$(\d{1,3}(?:,\d{3})*(?:\.\d{2})?|\d+(?:\.\d{2})?)(?: \+ .*)?$/;

function validDate(text: string | undefined): Date | null {
  if (!text) return null;
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * Turn one DealNews item into our shape.
 * Returns null (skip it) when it is a store-wide sale, has no single clear price,
 * or is not a product DealDrop tracks.
 */
export function parseDealNewsItem(item: DealNewsItem): SourceDeal | null {
  const title = item.title?.trim();
  const store = item["dealnews:retailer"]?.trim();
  const id = /\/(\d+)\.html/.exec(item.guid ?? "")?.[1];
  if (!title || !store || !id || !item.link) return null;
  if (item["dealnews:dealType"] === "sale") return null;

  const headline = HEADLINE.exec(title);
  if (!headline) return null;
  const productName = headline[1];
  const priceCents = parsePriceToCents(headline[2]);
  if (priceCents === null || priceCents === 0) return null;

  const sorted = sortProduct({ title: productName });
  if (!sorted) return null;

  // The first paragraph of the write-up is where the editor states the "was" price,
  // the 90-day average and whether this is an all-time low.
  const paragraph = /<p>([\s\S]*?)<\/p>/.exec(item.description ?? "")?.[1] ?? "";
  const facts = readPriceFacts(htmlToText(paragraph), priceCents);

  return {
    source: "dealnews",
    sourceId: id,
    title, // unchanged, as DealNews asks
    brand: null,
    specs: sorted.specs,
    store,
    category: sorted.category,
    subcategory: sorted.subcategory,
    priceCents,
    listPriceCents: facts.listPriceCents,
    insights: facts.insights,
    url: item.link, // unchanged, as DealNews asks
    imageUrl: item["media:content"]?.["@_url"] ?? null,
    sourceUpdatedAt: validDate(item.pubDate),
    expiresAt: validDate(item["dealnews:expires"]),
  };
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Fetch every DealNews feed, politely, and return each deal once. */
export async function fetchDealNewsDeals(): Promise<SourceDeal[]> {
  const byId = new Map<string, SourceDeal>();
  for (const [index, url] of DEALNEWS_FEEDS.entries()) {
    if (index > 0) await sleep(CRAWL_DELAY_MS);
    const res = await fetch(url, { headers: HEADERS, cache: "no-store" });
    if (!res.ok) throw new Error(`DealNews answered ${res.status} for ${url}`);
    for (const item of readDealNewsFeed(await res.text())) {
      const deal = parseDealNewsItem(item);
      if (deal) byId.set(deal.sourceId, deal);
    }
  }
  return [...byId.values()];
}
