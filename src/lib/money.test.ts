import { describe, expect, it } from "vitest";
import { formatCents, parsePriceToCents, percentOff } from "./money";

describe("parsePriceToCents", () => {
  it("reads plain prices", () => {
    expect(parsePriceToCents("19.99")).toBe(1999);
    expect(parsePriceToCents("5")).toBe(500);
    expect(parsePriceToCents("0.00")).toBe(0);
  });

  it("reads dollar signs, commas and spaces", () => {
    expect(parsePriceToCents("$1,299.99")).toBe(129999);
    expect(parsePriceToCents(" $ 49.5 ")).toBe(4950);
    expect(parsePriceToCents("12,000")).toBe(1200000);
  });

  it("reads numbers without rounding errors", () => {
    expect(parsePriceToCents(19.99)).toBe(1999);
    expect(parsePriceToCents(0.07)).toBe(7);
  });

  it("returns null instead of guessing", () => {
    expect(parsePriceToCents("")).toBeNull();
    expect(parsePriceToCents("free")).toBeNull();
    expect(parsePriceToCents("$10 - $20")).toBeNull();
    expect(parsePriceToCents("1,29.99")).toBeNull();
    expect(parsePriceToCents("19.999")).toBeNull();
    expect(parsePriceToCents(-5)).toBeNull();
    expect(parsePriceToCents(null)).toBeNull();
    expect(parsePriceToCents(NaN)).toBeNull();
  });
});

describe("formatCents", () => {
  it("shows dollars and cents", () => {
    expect(formatCents(129999)).toBe("$1,299.99");
    expect(formatCents(500)).toBe("$5.00");
  });
});

describe("percentOff", () => {
  it("works out the percent saved", () => {
    expect(percentOff(1500, 2000)).toBe(25);
    expect(percentOff(149, 299)).toBe(50);
  });

  it("is null when there is no real saving", () => {
    expect(percentOff(2000, 2000)).toBeNull();
    expect(percentOff(2500, 2000)).toBeNull();
    expect(percentOff(2000, null)).toBeNull();
    expect(percentOff(2000, 0)).toBeNull();
  });
});
