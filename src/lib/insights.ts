// Reads price facts out of a deal's write-up (the short paragraph DealNews editors write).
// Example: "it's $45 off the usual $81 price ... matches its Amazon all-time low of $36
// and sits below its 90-day average of $48."
//
// Only clear statements are used. If a sentence is vague, that fact is left out.

import { parsePriceToCents } from "./money";

export type Insights = {
  /** The source says this is the lowest price it has ever seen. */
  atAllTimeLow?: true;
  /** The all-time low the source quotes, in cents. */
  allTimeLowCents?: number;
  /** The 90-day average price the source quotes, in cents. */
  avg90Cents?: number;
  /**
   * Where the "was" price came from:
   * "stated"  = the write-up names it ("down from $34", "the $200 list price")
   * "savings" = the write-up names the saving ("$50 off"), so was = price + saving
   */
  listFrom?: "stated" | "savings";
};

export type PriceFacts = { listPriceCents: number | null; insights: Insights | null };

const MONEY = String.raw`\$(\d{1,3}(?:,\d{3})+(?:\.\d{2})?|\d+(?:\.\d{2})?)`;

// "off the usual $81 price", "from the $80 list price", "down from $34", "list price of $200"
const STATED_LIST = [
  new RegExp(String.raw`\b(?:off|from|under|below)\s+(?:the|its)\s+(?:usual |regular |original |normal )?${MONEY}\s+(?:list |retail |usual |regular )?price`, "i"),
  new RegExp(String.raw`\bdown from\s+(?:the |its )?${MONEY}`, "i"),
  new RegExp(String.raw`\b(?:list|retail|regular) price of\s+${MONEY}`, "i"),
  new RegExp(String.raw`\b(?:regularly|normally|usually)\s+${MONEY}`, "i"),
];

// "$50 off", "a savings of $45", "a $52 cut", "save $20"
const STATED_SAVING = [
  new RegExp(String.raw`${MONEY}\s+off\b`, "i"),
  new RegExp(String.raw`\bsavings? of\s+${MONEY}`, "i"),
  new RegExp(String.raw`\ba\s+${MONEY}\s+(?:cut|discount|drop|savings?)\b`, "i"),
  new RegExp(String.raw`\bsave\s+${MONEY}`, "i"),
];

const AVG_90 = new RegExp(String.raw`\b90-day\s+(?:[A-Za-z']+\s+)?average\s+(?:of|is|was)\s+${MONEY}`, "i");
const LOW_AMOUNT = new RegExp(String.raw`\ball-time low of\s+${MONEY}`, "i");

// Phrases that say the price IS the record low. "within a few cents of its all-time low" does not count.
const AT_LOW =
  /\b(?:match(?:es|ing)?|hits?|ties?|tying|beats?|beating|is|at|sets?|marks?)\s+(?:its|the|an?|a new)?\s*(?:previous |new |current )?(?:[A-Za-z']+\s+)?all-time low\b|\blowest price (?:we(?:'|’)ve |we have )?ever\b|\bbest price (?:we(?:'|’)ve |we have )?ever seen\b/i;

function firstMoney(text: string, patterns: RegExp[]): number | null {
  for (const pattern of patterns) {
    const match = pattern.exec(text);
    if (match) return parsePriceToCents(match[1]);
  }
  return null;
}

/** Turn the HTML of a write-up into plain text. */
export function htmlToText(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number(dec)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Read the "was" price and price-history facts from a write-up.
 * `priceCents` is the sale price, used to sanity-check what we read.
 */
export function readPriceFacts(text: string, priceCents: number): PriceFacts {
  const insights: Insights = {};
  let listPriceCents: number | null = null;

  const stated = firstMoney(text, STATED_LIST);
  // A real "was" price is higher than the sale price, and not absurdly higher.
  const sane = (cents: number | null): cents is number =>
    cents !== null && cents > priceCents && cents <= priceCents * 20;

  if (sane(stated)) {
    listPriceCents = stated;
    insights.listFrom = "stated";
  } else {
    const saving = firstMoney(text, STATED_SAVING);
    if (saving !== null && saving > 0 && sane(priceCents + saving)) {
      listPriceCents = priceCents + saving;
      insights.listFrom = "savings";
    }
  }

  const avg = AVG_90.exec(text);
  const avgCents = avg ? parsePriceToCents(avg[1]) : null;
  if (avgCents !== null && avgCents > 0) insights.avg90Cents = avgCents;

  const low = LOW_AMOUNT.exec(text);
  const lowCents = low ? parsePriceToCents(low[1]) : null;
  if (lowCents !== null && lowCents > 0) insights.allTimeLowCents = lowCents;

  // "At the all-time low" needs the words, and must not be contradicted by the quoted low.
  // (Titles round to whole dollars, so allow up to $1 of rounding.)
  const contradicts = lowCents !== null && priceCents > lowCents + 100;
  if (AT_LOW.test(text) && !contradicts) insights.atAllTimeLow = true;

  return { listPriceCents, insights: Object.keys(insights).length ? insights : null };
}
