import { describe, expect, it } from "vitest";
import { timeAgo } from "./time";

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
