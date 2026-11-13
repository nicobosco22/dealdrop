import { describe, expect, it } from "vitest";
import { endsLabel, timeAgo } from "./time";

const now = new Date("2026-11-12T12:00:00Z");
const ago = (minutes: number) => new Date(now.getTime() - minutes * 60000);

describe("timeAgo", () => {
  it("uses the right unit", () => {
    expect(timeAgo(ago(0), now)).toBe("just now");
    expect(timeAgo(ago(5), now)).toBe("5 min ago");
    expect(timeAgo(ago(120), now)).toBe("2 hr ago");
    expect(timeAgo(ago(60 * 24), now)).toBe("1 day ago");
    expect(timeAgo(ago(60 * 24 * 3), now)).toBe("3 days ago");
  });

  it("never shows a time in the future", () => {
    expect(timeAgo(ago(-10), now)).toBe("just now");
  });
});

describe("endsLabel", () => {
  const inHours = (h: number) => new Date(now.getTime() + h * 3600000);

  it("says how long is left", () => {
    expect(endsLabel(inHours(0.5), now)).toBe("Ends in under 1 hr");
    expect(endsLabel(inHours(5), now)).toBe("Ends in 5 hr");
    expect(endsLabel(inHours(24), now)).toBe("Ends in 1 day");
    expect(endsLabel(inHours(24 * 6), now)).toBe("Ends in 6 days");
  });

  it("says nothing when there is no date or it is far away", () => {
    expect(endsLabel(null, now)).toBeNull();
    expect(endsLabel(inHours(24 * 90), now)).toBeNull();
  });

  it("marks a deal that is over", () => {
    expect(endsLabel(inHours(-1), now)).toBe("Ended");
  });
});
