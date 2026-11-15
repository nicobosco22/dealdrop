// The deal score: one number from 0 to 100 that says how good a deal is.
// It is built from four things, so a big "% off" sticker alone cannot win:
//
//   Discount        up to 35   how far below the "was" price
//   Dollars saved   up to 15   $10 off matters less than $300 off
//   Price history   up to 35   at an all-time low? below its 90-day average?
//   Store           up to 15   how much we trust the seller
//
// It also runs the "real deal" check: a deal that claims a big markdown but is
// not actually below its 90-day average is flagged as an inflated markdown.

import type { Insights } from "./insights";
import { percentOff } from "./money";

export type ScoreInput = {
  priceCents: number;
  listPriceCents: number | null;
  store: string;
  insights: Insights | null;
};

export type Verdict = "all-time-low" | "below-average" | "inflated" | null;

export type DealScore = {
  score: number;
  /** The points behind the score, for showing the working. */
  parts: { discount: number; saved: number; history: number; store: number };
  verdict: Verdict;
};

// Big, well-known retailers with dependable returns and shipping.
const TRUSTED = [
  "amazon", "best buy", "walmart", "target", "costco", "sam's club", "newegg", "b&h", "micro center",
  "home depot", "lowe's", "wayfair", "apple", "samsung", "dell", "lenovo", "hp", "lg", "lego", "kohl's",
  "adorama", "woot", "monoprice", "logitech", "razer", "corsair", "steelseries", "hyperx", "qvc", "ikea",
  "macy's", "microsoft", "google", "sony", "bose", "crutchfield", "gamestop", "staples", "office depot",
];
// Marketplaces where the seller and the item's condition vary a lot.
const MARKETPLACES = ["ebay", "aliexpress", "temu", "wish", "dhgate", "banggood", "untilgone", "dailysteals"];

export function storePoints(store: string): number {
  const name = store.trim().toLowerCase();
  if (TRUSTED.some((s) => name === s || name.startsWith(`${s} `) || name.startsWith(`${s}.`))) return 15;
  if (MARKETPLACES.some((s) => name.includes(s))) return 5;
  return 9; // unknown store: neither trusted nor distrusted
}

const clamp = (n: number, low: number, high: number) => Math.min(high, Math.max(low, n));

export function scoreDeal(deal: ScoreInput): DealScore {
  const off = percentOff(deal.priceCents, deal.listPriceCents) ?? 0;
  const savedDollars = deal.listPriceCents ? Math.max(0, deal.listPriceCents - deal.priceCents) / 100 : 0;
  const insights = deal.insights ?? {};
  const avg = insights.avg90Cents ?? null;

  // How far below (positive) or above (negative) the 90-day average, as a fraction.
  const vsAverage = avg ? (avg - deal.priceCents) / avg : null;

  let verdict: Verdict = null;
  if (insights.atAllTimeLow) verdict = "all-time-low";
  else if (vsAverage !== null && vsAverage >= 0.03) verdict = "below-average";
  // The "real deal" check: a 20%+ markdown that is not below the usual price is not a real markdown.
  else if (vsAverage !== null && vsAverage < 0.03 && off >= 20) verdict = "inflated";

  // Discount: 70% off or more earns full marks.
  let discount = (clamp(off, 0, 70) / 70) * 35;
  // Dollars saved: grows slowly, $1,000 saved earns full marks.
  let saved = clamp(Math.log10(savedDollars + 1) / 3, 0, 1) * 15;
  // An inflated markdown keeps only a quarter of its sticker points.
  if (verdict === "inflated") {
    discount *= 0.25;
    saved *= 0.25;
  }

  let history = 0;
  if (insights.atAllTimeLow) history += 22;
  // Up to 13 more for beating the 90-day average; 30% below earns all of it.
  if (vsAverage !== null && vsAverage > 0) history += (clamp(vsAverage, 0, 0.3) / 0.3) * 13;

  const store = storePoints(deal.store);
  const parts = {
    discount: Math.round(discount),
    saved: Math.round(saved),
    history: Math.round(history),
    store,
  };
  return { score: clamp(parts.discount + parts.saved + parts.history + parts.store, 0, 100), parts, verdict };
}

/** One short word for a score, for people who would rather not read numbers. */
export function scoreWord(score: number, hasPriceFacts: boolean): string {
  // With no "was" price and no price history, the score only reflects the store,
  // so we say so instead of judging the deal.
  if (!hasPriceFacts) return "No price info";
  if (score >= 70) return "Great deal";
  if (score >= 50) return "Good deal";
  if (score >= 30) return "Fair deal";
  return "Small saving";
}

export type ScoreLine = { label: string; points: number; max: number; text: string };
export type ScoreExplanation = { score: number; word: string; lines: ScoreLine[]; warning: string | null };

const dollars = (cents: number) => (cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });

/** Explains a score in plain sentences, one line per part. */
export function explainScore(deal: ScoreInput): ScoreExplanation {
  const { score, parts, verdict } = scoreDeal(deal);
  const off = percentOff(deal.priceCents, deal.listPriceCents);
  const insights = deal.insights ?? {};
  const hasPriceFacts = off !== null || Boolean(insights.atAllTimeLow || insights.avg90Cents);

  let history = "No price history has been reported for this item yet.";
  if (insights.avg90Cents) {
    const gap = Math.round((Math.abs(insights.avg90Cents - deal.priceCents) / insights.avg90Cents) * 100);
    const side = deal.priceCents < insights.avg90Cents ? "below" : deal.priceCents > insights.avg90Cents ? "above" : "the same as";
    const usual = `It has averaged ${dollars(insights.avg90Cents)} over the last 90 days, so this is ${gap ? `${gap}% ` : ""}${side} its usual price.`;
    history = insights.atAllTimeLow ? `This is the lowest price on record. ${usual}` : usual;
  } else if (insights.atAllTimeLow) {
    history = "This is the lowest price on record.";
  }

  const storePoints = parts.store;
  const store =
    storePoints >= 15
      ? `${deal.store} is a big, well-known store.`
      : storePoints <= 5
        ? `${deal.store} is a marketplace, so the seller and the item's condition can vary.`
        : `${deal.store} is a smaller store we know less about.`;

  return {
    score,
    word: scoreWord(score, hasPriceFacts),
    lines: [
      {
        label: "Discount",
        points: parts.discount,
        max: 35,
        text:
          off !== null && deal.listPriceCents
            ? `${off}% below the usual price of ${dollars(deal.listPriceCents)}.`
            : "No usual price to compare with.",
      },
      {
        label: "Money saved",
        points: parts.saved,
        max: 15,
        text:
          off !== null && deal.listPriceCents
            ? `You keep ${dollars(deal.listPriceCents - deal.priceCents)}.`
            : "Unknown without a usual price.",
      },
      { label: "Price history", points: parts.history, max: 35, text: history },
      { label: "Store", points: storePoints, max: 15, text: store },
    ],
    warning:
      verdict === "inflated"
        ? "The discount looks bigger than it is. The item has cost about this much for 90 days, so most of the discount points were taken away."
        : null,
  };
}
