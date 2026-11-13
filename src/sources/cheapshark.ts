// Source: CheapShark (https://apidocs.cheapshark.com)
// What it gives: PC game prices from Steam, GOG, Humble and other stores.
// Cost: free, no key. They ask apps to send a clear User-Agent and not hammer the API.

import { parsePriceToCents } from "@/lib/money";
import type { SourceDeal } from "./types";

const API = "https://www.cheapshark.com/api/1.0";
const HEADERS = { "User-Agent": "DealDrop/0.1 (personal deal tracker)" };

/** One deal exactly as CheapShark sends it (only the fields we use). */
export type CheapSharkDeal = {
  title: string;
  dealID: string;
  storeID: string;
  salePrice: string;
  normalPrice: string;
  lastChange: number;
  thumb: string;
};

export type CheapSharkStore = { storeID: string; storeName: string; isActive: number };

/**
 * Turn one CheapShark deal into our shape.
 * Returns null (skip it) if anything important is missing or unreadable.
 */
export function parseCheapSharkDeal(
  raw: CheapSharkDeal,
  storeNames: Map<string, string>,
): SourceDeal | null {
  const priceCents = parsePriceToCents(raw.salePrice);
  const store = storeNames.get(raw.storeID);
  if (priceCents === null || !store || !raw.dealID || !raw.title?.trim()) return null;

  return {
    source: "cheapshark",
    sourceId: raw.dealID,
    title: raw.title.trim(),
    brand: null,
    specs: null,
    store,
    category: "technology",
    subcategory: "consoles-games",
    priceCents,
    listPriceCents: parsePriceToCents(raw.normalPrice),
    // CheapShark sends dealID already URL-encoded, so it goes in as-is.
    url: `https://www.cheapshark.com/redirect?dealID=${raw.dealID}`,
    imageUrl: raw.thumb || null,
    sourceUpdatedAt: raw.lastChange ? new Date(raw.lastChange * 1000) : null,
    expiresAt: null,
  };
}

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: HEADERS, cache: "no-store" });
  if (!res.ok) throw new Error(`CheapShark answered ${res.status} for ${url}`);
  return (await res.json()) as T;
}

/** Fetch the newest deals from CheapShark (2 calls total). */
export async function fetchCheapSharkDeals(): Promise<SourceDeal[]> {
  const stores = await getJson<CheapSharkStore[]>(`${API}/stores`);
  const storeNames = new Map(stores.map((s) => [s.storeID, s.storeName]));

  const raw = await getJson<CheapSharkDeal[]>(`${API}/deals?pageSize=60&sortBy=Recent&onSale=1`);
  return raw
    .map((deal) => parseCheapSharkDeal(deal, storeNames))
    .filter((deal): deal is SourceDeal => deal !== null);
}
