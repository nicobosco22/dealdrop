import { describe, expect, it } from "vitest";
import { explainScore, scoreDeal, scoreWord, storePoints, type ScoreInput } from "./score";

const base: ScoreInput = { priceCents: 10000, listPriceCents: null, store: "Amazon", insights: null };

describe("storePoints", () => {
  it("trusts big retailers most and marketplaces least", () => {
    expect(storePoints("Amazon")).toBe(15);
    expect(storePoints("Best Buy")).toBe(15);
    expect(storePoints("B&H Photo Video")).toBe(15);
    expect(storePoints("eBay")).toBe(5);
    expect(storePoints("AliExpress")).toBe(5);
    expect(storePoints("Some Small Shop")).toBe(9);
  });

  it("does not confuse a lookalike name with a trusted store", () => {
    expect(storePoints("Amazonia Outlet")).toBe(9);
  });
});

describe("scoreDeal", () => {
  it("gives a deal with no markdown and no history only its store points", () => {
    expect(scoreDeal(base)).toEqual({
      score: 15,
      parts: { discount: 0, saved: 0, history: 0, store: 15 },
      verdict: null,
    });
  });

  it("does the math for a plain 50% markdown", () => {
    // 50/70 * 35 = 25 discount points; saving $100 -> log10(101)/3 * 15 = 10 points.
    const result = scoreDeal({ ...base, listPriceCents: 20000 });
    expect(result.parts).toEqual({ discount: 25, saved: 10, history: 0, store: 15 });
    expect(result.score).toBe(50);
  });

  it("caps discount points at 70% off", () => {
    const at70 = scoreDeal({ ...base, priceCents: 3000, listPriceCents: 10000 });
    const at90 = scoreDeal({ ...base, priceCents: 1000, listPriceCents: 10000 });
    expect(at70.parts.discount).toBe(35);
    expect(at90.parts.discount).toBe(35);
  });

  it("rewards an all-time low", () => {
    const result = scoreDeal({ ...base, insights: { atAllTimeLow: true } });
    expect(result.verdict).toBe("all-time-low");
    expect(result.parts.history).toBe(22);
  });

  it("rewards beating the 90-day average, more the further below it is", () => {
    const small = scoreDeal({ ...base, insights: { avg90Cents: 11000 } }); // about 9% below
    const big = scoreDeal({ ...base, insights: { avg90Cents: 20000 } }); // 50% below
    expect(small.verdict).toBe("below-average");
    expect(small.parts.history).toBe(4);
    expect(big.parts.history).toBe(13);
  });

  it("gives full history points for an all-time low far below average", () => {
    const result = scoreDeal({ ...base, insights: { atAllTimeLow: true, avg90Cents: 20000 } });
    expect(result.parts.history).toBe(35);
  });

  it("flags a fake markdown: big sticker discount, but not below the usual price", () => {
    // "Was $200, now $100" but it has averaged $100 for 90 days.
    const fake = scoreDeal({ ...base, listPriceCents: 20000, insights: { avg90Cents: 10000 } });
    const real = scoreDeal({ ...base, listPriceCents: 20000, insights: { avg90Cents: 18000 } });
    expect(fake.verdict).toBe("inflated");
    expect(fake.parts.discount).toBe(6); // a quarter of 25
    expect(real.verdict).toBe("below-average");
    expect(fake.score).toBeLessThan(real.score - 25);
  });

  it("does not call a small markdown fake", () => {
    const result = scoreDeal({ ...base, listPriceCents: 11000, insights: { avg90Cents: 10000 } });
    expect(result.verdict).toBeNull();
  });

  it("ranks the same deal lower at a marketplace than at a trusted store", () => {
    const trusted = scoreDeal({ ...base, listPriceCents: 20000 });
    const market = scoreDeal({ ...base, listPriceCents: 20000, store: "eBay" });
    expect(trusted.score - market.score).toBe(10);
  });

  it("never goes above 100", () => {
    const best = scoreDeal({
      priceCents: 10000,
      listPriceCents: 200000,
      store: "Costco",
      insights: { atAllTimeLow: true, avg90Cents: 50000 },
    });
    expect(best.score).toBe(100);
  });
});

describe("scoreWord", () => {
  it("turns a score into a plain word", () => {
    expect(scoreWord(85, true)).toBe("Great deal");
    expect(scoreWord(55, true)).toBe("Good deal");
    expect(scoreWord(35, true)).toBe("Fair deal");
    expect(scoreWord(20, true)).toBe("Small saving");
  });

  it("does not judge a deal it knows nothing about", () => {
    expect(scoreWord(15, false)).toBe("No price info");
  });
});

describe("explainScore", () => {
  it("explains each part in a sentence, and the points add up to the score", () => {
    const result = explainScore({
      priceCents: 10000,
      listPriceCents: 20000,
      store: "Amazon",
      insights: { atAllTimeLow: true, avg90Cents: 12500 },
    });
    expect(result.word).toBe("Great deal");
    expect(result.lines.map((l) => l.text)).toEqual([
      "50% below the usual price of $200.00.",
      "You keep $100.00.",
      "This is the lowest price on record. It has averaged $125.00 over the last 90 days, so this is 20% below its usual price.",
      "Amazon is a big, well-known store.",
    ]);
    expect(result.lines.reduce((sum, l) => sum + l.points, 0)).toBe(result.score);
    expect(result.warning).toBeNull();
  });

  it("says so when there is nothing to go on", () => {
    const result = explainScore({ ...base, store: "Tiny Shop" });
    expect(result.word).toBe("No price info");
    expect(result.lines.map((l) => l.text)).toEqual([
      "No usual price to compare with.",
      "Unknown without a usual price.",
      "No price history has been reported for this item yet.",
      "Tiny Shop is a smaller store we know less about.",
    ]);
  });

  it("warns about a fake discount and explains a marketplace", () => {
    const result = explainScore({ ...base, listPriceCents: 20000, store: "eBay", insights: { avg90Cents: 10000 } });
    expect(result.warning).toContain("looks bigger than it is");
    expect(result.lines[2].text).toBe(
      "It has averaged $100.00 over the last 90 days, so this is the same as its usual price.",
    );
    expect(result.lines[3].text).toContain("marketplace");
  });
});
