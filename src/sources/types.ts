// The one shape every data source must hand back.
// Each source file (cheapshark.ts, bestbuy.ts, ...) turns its own format into this.

export type Category = "technology" | "house" | "furniture" | "lego";

export type SourceDeal = {
  /** Which source this came from, for example "cheapshark". */
  source: string;
  /** The source's own id for this deal, so we can update it instead of adding a copy. */
  sourceId: string;
  title: string;
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
