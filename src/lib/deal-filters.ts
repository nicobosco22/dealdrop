// Reads the filters out of the page address (the part after "?").
// Example: /?cat=technology&store=Steam&max=20&sort=off
// Keeping filters in the address means you can bookmark or share any view.

import { isCategory, TECH_SUBCATEGORIES } from "./categories";
import { parsePriceToCents } from "./money";
import type { Category } from "@/sources/types";

export const SORTS = ["newest", "price", "off", "saved", "title", "store"] as const;
export type Sort = (typeof SORTS)[number];

export type Filters = {
  q: string;
  category: Category | null;
  subcategory: string | null;
  stores: string[];
  minCents: number | null;
  maxCents: number | null;
  /** Only show deals at least this many percent off. */
  minOff: number | null;
  // Spec filters. Each one only works inside the subcategory it belongs to.
  resolution: string | null; // monitors
  panel: string | null; // monitors
  minHz: number | null; // monitors
  minSize: number | null; // monitors
  connection: "wired" | "wireless" | null; // gaming gear
  minVram: number | null; // PC parts (graphics cards)
  sort: Sort;
  dir: "asc" | "desc";
  view: "table" | "cards";
};

export const RESOLUTIONS = ["1080p", "1440p", "4K", "5K", "8K"] as const;
export const PANELS = ["OLED", "IPS", "VA", "TN", "Mini-LED"] as const;

export type RawParams = Record<string, string | string[] | undefined>;

/** The direction each sort starts in when you first click it. */
export const DEFAULT_DIR: Record<Sort, "asc" | "desc"> = {
  newest: "desc",
  price: "asc",
  off: "desc",
  saved: "desc",
  title: "asc",
  store: "asc",
};

function one(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value)?.trim() ?? "";
}

function many(value: string | string[] | undefined): string[] {
  const list = Array.isArray(value) ? value : value ? [value] : [];
  return [...new Set(list.map((v) => v.trim()).filter(Boolean))];
}

/** Turn whatever is in the address into safe, known filter values. Bad values are ignored. */
export function parseFilters(raw: RawParams): Filters {
  const cat = one(raw.cat);
  const category = isCategory(cat) ? cat : null;

  const sub = one(raw.sub);
  const subcategory =
    category === "technology" && TECH_SUBCATEGORIES.some((s) => s.id === sub) ? sub : null;

  let minCents = parsePriceToCents(one(raw.min));
  let maxCents = parsePriceToCents(one(raw.max));
  // If someone types the range backwards, swap it instead of showing nothing.
  if (minCents !== null && maxCents !== null && minCents > maxCents) {
    [minCents, maxCents] = [maxCents, minCents];
  }

  const off = Number(one(raw.off));
  const minOff = Number.isInteger(off) && off > 0 && off < 100 ? off : null;

  const wholeNumber = (key: string) => {
    const n = Number(one(raw[key]));
    return Number.isInteger(n) && n > 0 && n < 10000 ? n : null;
  };
  const pick = <T extends string>(key: string, allowed: readonly T[]): T | null => {
    const v = one(raw[key]);
    return (allowed as readonly string[]).includes(v) ? (v as T) : null;
  };
  const isMonitors = subcategory === "monitors";

  const sortText = one(raw.sort);
  const sort = (SORTS as readonly string[]).includes(sortText) ? (sortText as Sort) : "newest";
  const dirText = one(raw.dir);
  const dir = dirText === "asc" || dirText === "desc" ? dirText : DEFAULT_DIR[sort];

  return {
    q: one(raw.q).slice(0, 100),
    category,
    subcategory,
    stores: many(raw.store),
    minCents,
    maxCents,
    minOff,
    resolution: isMonitors ? pick("res", RESOLUTIONS) : null,
    panel: isMonitors ? pick("panel", PANELS) : null,
    minHz: isMonitors ? wholeNumber("hz") : null,
    minSize: isMonitors ? wholeNumber("size") : null,
    connection: subcategory === "gaming-gear" ? pick("conn", ["wired", "wireless"] as const) : null,
    minVram: subcategory === "pc-parts" ? wholeNumber("vram") : null,
    sort,
    dir,
    view: one(raw.view) === "cards" ? "cards" : "table",
  };
}

/** Build a link to the same page with some filters changed. Empty values are left out. */
export function hrefWith(raw: RawParams, changes: Record<string, string | null>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(raw)) {
    for (const v of Array.isArray(value) ? value : value ? [value] : []) {
      if (v.trim()) params.append(key, v);
    }
  }
  for (const [key, value] of Object.entries(changes)) {
    params.delete(key);
    if (value) params.set(key, value);
  }
  const text = params.toString();
  return text ? `/?${text}` : "/";
}

/** How many filters are switched on (search and sort don't count). */
export function activeFilterCount(f: Filters): number {
  return (
    (f.category ? 1 : 0) +
    (f.subcategory ? 1 : 0) +
    f.stores.length +
    (f.minCents !== null ? 1 : 0) +
    (f.maxCents !== null ? 1 : 0) +
    (f.minOff !== null ? 1 : 0) +
    [f.resolution, f.panel, f.minHz, f.minSize, f.connection, f.minVram].filter((v) => v !== null).length
  );
}
