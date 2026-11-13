// One call for data sources: give it a product, get back where it goes and its specs.
// Null means the product does not belong in DealDrop and should be skipped.

import { classifyProduct, type Placement, type ProductInfo } from "./classify";
import { extractSpecs, type Specs } from "./specs";

export type SortedProduct = Placement & { specs: Specs | null };

export function sortProduct(product: ProductInfo): SortedProduct | null {
  const placement = classifyProduct(product);
  if (!placement) return null;
  return { ...placement, specs: extractSpecs(placement.subcategory, product.title) };
}
