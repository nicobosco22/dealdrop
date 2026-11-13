// The one shape every data source must hand back.
// Each source file (dealnews.ts, bestbuy.ts, ...) turns its own format into this.

import type { Specs } from "@/lib/specs";

export type Category = "technology" | "house" | "furniture" | "lego";

export type SourceDeal = {
  /** Which source this came from, for example "dealnews". */
  source: string;
  /** The source's own id for this deal, so we can update it instead of adding a copy. */
  sourceId: string;
  title: string;
  /** The maker, when the source tells us (for example "Logitech"). */
  brand: string | null;
  /** Key specs read from the title, when there are any. */
  specs: Specs | null;
  /** The store selling it, for example "Steam". */
  store: string;
  category: Category;
  subcategory: string | null;
  /** Sale price in cents. Always a real number from the source, never a guess. */
  priceCents: number;
  /** The store's "was" price in cents, if the source gives one. */
  listPriceCents: number | null;
  /** Link to the deal. Required: no link, no deal. */
  url: string;
  imageUrl: string | null;
  /** When the source says the deal last changed, if known. */
  sourceUpdatedAt: Date | null;
  /** When the deal ends, if known. */
  expiresAt: Date | null;
};
