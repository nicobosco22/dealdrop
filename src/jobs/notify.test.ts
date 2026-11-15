import { describe, expect, it } from "vitest";
import { openDb } from "@/db/client";
import { deals, watches } from "@/db/schema";
import type { SourceDeal } from "@/sources/types";
import { settings } from "@/db/schema";
import { buildAlertMessage, checkWebhook, findNewMatches, getWebhook, sendAlerts, WEBHOOK_SETTING } from "./notify";
import { saveDeals } from "./save-deals";

function deal(title: string, priceCents: number, over: Partial<SourceDeal> = {}): SourceDeal {
  return {
    source: "test",
    sourceId: title,
    title,
    brand: null,
    specs: null,
    store: "Best Buy",
    category: "technology",
    subcategory: "monitors",
    priceCents,
    listPriceCents: null,
    insights: null,
    url: `https://example.com/${encodeURIComponent(title)}`,
    imageUrl: null,
    sourceUpdatedAt: null,
    expiresAt: null,
    ...over,
  };
}

describe("watchlist alerts", () => {
  it("finds only deals first seen after the last alert, under the top price", async () => {
    const db = await openDb();
    const before = new Date("2026-11-12T09:00:00Z");
    const watchMade = new Date("2026-11-12T10:00:00Z");
    const after = new Date("2026-11-12T11:00:00Z");

    await saveDeals(db, [deal("Old OLED Monitor", 40000)], before);
    const [watch] = await db
      .insert(watches)
      .values({ keyword: "oled monitor", maxPriceCents: 50000, createdAt: watchMade, lastNotifiedAt: watchMade })
      .returning();
    await saveDeals(
      db,
      [
        deal("New 27 inch OLED Gaming Monitor", 45000),
        deal("Pricey OLED Monitor", 90000),
        deal("New IPS Monitor", 20000),
      ],
      after,
    );

    const matches = await findNewMatches(db, watch, new Date("2026-11-12T12:00:00Z"));
    expect(matches.map((d) => d.title)).toEqual(["New 27 inch OLED Gaming Monitor"]);
  });

  it("writes a clear message with price, discount, store and link", async () => {
    const db = await openDb();
    await saveDeals(
      db,
      [deal("LG OLED Monitor", 45000, { listPriceCents: 90000, insights: { atAllTimeLow: true } })],
      new Date("2026-11-12T11:00:00Z"),
    );
    const rows = await db.select().from(deals);
    expect(buildAlertMessage({ keyword: "oled monitor", maxPriceCents: 50000 }, rows)).toBe(
      'DealDrop: 1 new deal for "oled monitor" under $500.00\n' +
        "• $450.00 (-50%) at Best Buy · all-time low: LG OLED Monitor\n" +
        "  https://example.com/LG%20OLED%20Monitor",
    );
  });

  it("shortens a long list", async () => {
    const db = await openDb();
    await saveDeals(db, Array.from({ length: 7 }, (_, i) => deal(`Monitor ${i}`, 10000 + i)), new Date("2026-11-12T11:00:00Z"));
    const message = buildAlertMessage({ keyword: "monitor", maxPriceCents: null }, await db.select().from(deals));
    expect(message).toContain('7 new deals for "monitor"\n');
    expect(message.match(/•/g)).toHaveLength(5);
    expect(message).toContain("…and 2 more");
  });

  it("sends nothing when no webhook is set", async () => {
    const saved = process.env.DISCORD_WEBHOOK_URL;
    delete process.env.DISCORD_WEBHOOK_URL;
    try {
      expect(await sendAlerts(await openDb())).toEqual({ sent: 0, skipped: "no webhook set" });
    } finally {
      if (saved !== undefined) process.env.DISCORD_WEBHOOK_URL = saved;
    }
  });
});

describe("checkWebhook", () => {
  it("accepts real Discord webhook addresses", () => {
    expect(checkWebhook("https://discord.com/api/webhooks/123456789012345678/abc-DEF_123").status).toBe("ready");
    expect(checkWebhook("  https://discordapp.com/api/webhooks/123/abc  ").status).toBe("ready");
  });

  it("says when nothing is set", () => {
    expect(checkWebhook(undefined).status).toBe("missing");
    expect(checkWebhook("   ").status).toBe("missing");
  });

  it("refuses anything that is not a Discord webhook", () => {
    expect(checkWebhook("https://example.com/api/webhooks/123/abc").status).toBe("not-discord");
    expect(checkWebhook("https://discord.com.evil.example/api/webhooks/123/abc").status).toBe("not-discord");
    expect(checkWebhook("http://discord.com/api/webhooks/123/abc").status).toBe("not-discord");
    expect(checkWebhook("https://discord.com/channels/123/456").status).toBe("not-discord");
  });
});

describe("getWebhook", () => {
  // These tests must not depend on a real address in the environment.
  const withoutEnv = async <T>(run: () => Promise<T>) => {
    const saved = process.env.DISCORD_WEBHOOK_URL;
    delete process.env.DISCORD_WEBHOOK_URL;
    try {
      return await run();
    } finally {
      if (saved !== undefined) process.env.DISCORD_WEBHOOK_URL = saved;
    }
  };

  it("uses the address saved from the Watchlist page", async () => {
    const db = await openDb();
    await withoutEnv(async () => {
      expect((await getWebhook(db)).status).toBe("missing");
      await db.insert(settings).values({ key: WEBHOOK_SETTING, value: "https://discord.com/api/webhooks/1/abc" });
      expect(await getWebhook(db)).toEqual({ status: "ready", url: "https://discord.com/api/webhooks/1/abc" });
    });
  });

  it("lets .env.local win over the saved one", async () => {
    const db = await openDb();
    await db.insert(settings).values({ key: WEBHOOK_SETTING, value: "https://discord.com/api/webhooks/1/saved" });
    const saved = process.env.DISCORD_WEBHOOK_URL;
    process.env.DISCORD_WEBHOOK_URL = "https://discord.com/api/webhooks/2/fromenv";
    try {
      expect((await getWebhook(db)).url).toBe("https://discord.com/api/webhooks/2/fromenv");
    } finally {
      if (saved === undefined) delete process.env.DISCORD_WEBHOOK_URL;
      else process.env.DISCORD_WEBHOOK_URL = saved;
    }
  });
});
