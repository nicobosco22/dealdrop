import { describe, expect, it } from "vitest";
import { htmlToText, readPriceFacts } from "./insights";

// The sentences below follow the wording DealNews editors really use.

describe("reading the 'was' price", () => {
  it("uses a list price the write-up names", () => {
    expect(readPriceFacts("it's $45 off the usual $81 price on Amazon.", 3600)).toEqual({
      listPriceCents: 8100,
      insights: { listFrom: "stated" },
    });
    expect(readPriceFacts("It's currently $100 (50%) off the $200 list price on Amazon.", 10000).listPriceCents).toBe(20000);
    expect(readPriceFacts("These net lights are $25, down from $34.", 2500).listPriceCents).toBe(3400);
    expect(readPriceFacts("this speaker is $200, down from the $399 list price.", 19900).listPriceCents).toBe(39900);
    expect(readPriceFacts("marked down to $28, a $52 cut from the $80 list price.", 2800).listPriceCents).toBe(8000);
    expect(readPriceFacts("It has a list price of $1,049.99 at Amazon.", 99900).listPriceCents).toBe(104999);
  });

  it("adds the saving to the price when only the saving is named", () => {
    expect(readPriceFacts("Best Buy has this gaming monitor at $50 off.", 15000)).toEqual({
      listPriceCents: 20000,
      insights: { listFrom: "savings" },
    });
    expect(readPriceFacts("Apply the coupon for a savings of $45.", 3600).listPriceCents).toBe(8100);
    expect(readPriceFacts("at $599.99, which is $450 off.", 60000).listPriceCents).toBe(105000);
  });

  it("prefers a named list price over a named saving", () => {
    const facts = readPriceFacts("This set is $12 off the $44 list price.", 3100);
    expect(facts.listPriceCents).toBe(4400);
    expect(facts.insights?.listFrom).toBe("stated");
  });

  it("gives no 'was' price when nothing clear is said", () => {
    expect(readPriceFacts("This heater is 51% off at eBay, in new condition.", 4900).listPriceCents).toBeNull();
    expect(readPriceFacts("A handy little gadget with free shipping.", 4900)).toEqual({
      listPriceCents: null,
      insights: null,
    });
  });

  it("ignores a 'was' price that makes no sense", () => {
    // Lower than the sale price.
    expect(readPriceFacts("down from $10.", 2500).listPriceCents).toBeNull();
    // More than 20 times the sale price.
    expect(readPriceFacts("down from $9,999.", 2500).listPriceCents).toBeNull();
  });
});

describe("reading price history", () => {
  it("reads the 90-day average", () => {
    expect(readPriceFacts("sits well below its 90-day average of $106.", 8000).insights).toEqual({ avg90Cents: 10600 });
    expect(readPriceFacts("Its 90-day Amazon average is $430.", 38900).insights?.avg90Cents).toBe(43000);
    expect(readPriceFacts("The 90-day average is $48.", 3600).insights?.avg90Cents).toBe(4800);
  });

  it("flags a price at its all-time low", () => {
    const at = (text: string, price: number) => readPriceFacts(text, price).insights?.atAllTimeLow;
    expect(at("this price matches its Amazon all-time low of $16.", 1600)).toBe(true);
    expect(at("At $80, this light hits its Amazon all-time low.", 8000)).toBe(true);
    expect(at("Amazon lists this at $7, which is its Amazon all-time low.", 700)).toBe(true);
    expect(at("this price beats its previous Amazon all-time low of $40.", 3600)).toBe(true);
    expect(at("the lowest price we've ever seen.", 8000)).toBe(true);
    expect(at("the $389 price is the lowest price ever on Amazon.", 38900)).toBe(true);
  });

  it("does not flag a price that is only near the all-time low", () => {
    const facts = readPriceFacts("it is within a couple of cents of its Amazon all-time low of $62.97.", 6300);
    expect(facts.insights).toEqual({ allTimeLowCents: 6297 });
    expect(readPriceFacts("That's $5 above its all-time low.", 6300).insights).toBeNull();
  });

  it("does not flag a low that the quoted number contradicts", () => {
    const facts = readPriceFacts("This matches its all-time low of $40.", 5500);
    expect(facts.insights).toEqual({ allTimeLowCents: 4000 });
  });

  it("reads everything from one write-up", () => {
    const text =
      "Amazon has the lamp at $85, which is $35 off and $10 below its 90-day average of $95. It matches its all-time low.";
    expect(readPriceFacts(text, 8500)).toEqual({
      listPriceCents: 12000,
      insights: { listFrom: "savings", avg90Cents: 9500, atAllTimeLow: true },
    });
  });
});

describe("htmlToText", () => {
  it("strips tags and decodes symbols", () => {
    expect(htmlToText("<p>It&#x27;s <b>$5</b> &amp; ships&nbsp;free &#36;1</p>")).toBe("It's $5 & ships free $1");
  });
});
