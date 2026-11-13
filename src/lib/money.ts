// Money helpers. We store every price as whole cents (an integer),
// because decimals like 0.1 + 0.2 go wrong in JavaScript.

/**
 * Turn a price like "$1,299.99", "19.99" or 5 into cents (129999, 1999, 500).
 * Returns null when the text is not clearly one price. We never guess a price.
 */
export function parsePriceToCents(input: string | number | null | undefined): number | null {
  if (input === null || input === undefined) return null;

  if (typeof input === "number") {
    if (!Number.isFinite(input) || input < 0) return null;
    return Math.round(input * 100);
  }

  const text = input.trim();
  // Allowed shapes: optional "$", digits with optional thousands commas, optional cents.
  const match = /^\$?\s*(\d{1,3}(?:,\d{3})+|\d+)(?:\.(\d{1,2}))?$/.exec(text);
  if (!match) return null;

  const dollars = Number(match[1].replace(/,/g, ""));
  const centsText = (match[2] ?? "").padEnd(2, "0");
  return dollars * 100 + Number(centsText || 0);
}

/** Show cents as dollars, for example 129999 -> "$1,299.99". */
export function formatCents(cents: number): string {
  return (cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });
}

/** Percent saved, rounded to a whole number. Null if there is no real list price. */
export function percentOff(priceCents: number, listPriceCents: number | null): number | null {
  if (listPriceCents === null || listPriceCents <= 0 || priceCents >= listPriceCents) return null;
  return Math.round(((listPriceCents - priceCents) / listPriceCents) * 100);
}
