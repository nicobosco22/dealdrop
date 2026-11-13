// Watchlist alerts. After each fetch, any deal that newly matches a watch is
// announced once, to a Discord channel if DISCORD_WEBHOOK_URL is set in .env.local.
// With no webhook set, nothing is sent anywhere; matches still show on the Watchlist page.

import { and, eq, gt } from "drizzle-orm";
import type { Db } from "@/db/client";
import { watchWhere } from "@/db/queries";
import { deals, watches, type DealRow, type WatchRow } from "@/db/schema";
import { formatCents, percentOff } from "@/lib/money";

const MAX_DEALS_PER_ALERT = 5;

/** The text of one alert. Kept as its own function so it can be tested without sending anything. */
export function buildAlertMessage(watch: Pick<WatchRow, "keyword" | "maxPriceCents">, matches: DealRow[]): string {
  const limit = watch.maxPriceCents !== null ? ` under ${formatCents(watch.maxPriceCents)}` : "";
  const lines = matches.slice(0, MAX_DEALS_PER_ALERT).map((deal) => {
    const off = percentOff(deal.priceCents, deal.listPriceCents);
    const low = deal.verdict === "all-time-low" ? " · all-time low" : "";
    return `• ${formatCents(deal.priceCents)}${off !== null ? ` (-${off}%)` : ""} at ${deal.store}${low}: ${deal.title}\n  ${deal.url}`;
  });
  const more = matches.length > MAX_DEALS_PER_ALERT ? `\n…and ${matches.length - MAX_DEALS_PER_ALERT} more` : "";
  const count = `${matches.length} new ${matches.length === 1 ? "deal" : "deals"}`;
  return `DealDrop: ${count} for "${watch.keyword}"${limit}\n${lines.join("\n")}${more}`;
}

/** Deals that match this watch and were first seen after its last alert. */
export async function findNewMatches(db: Db, watch: WatchRow, now: Date): Promise<DealRow[]> {
  return db
    .select()
    .from(deals)
    .where(and(watchWhere(watch, now), gt(deals.firstSeenAt, watch.lastNotifiedAt)))
    .orderBy(deals.priceCents);
}

export type AlertReport = { sent: number; skipped: "no webhook set" | null };

export async function sendAlerts(db: Db, now: Date = new Date()): Promise<AlertReport> {
  const webhook = process.env.DISCORD_WEBHOOK_URL;
  if (!webhook) return { sent: 0, skipped: "no webhook set" };

  let sent = 0;
  for (const watch of await db.select().from(watches)) {
    const matches = await findNewMatches(db, watch, now);
    if (matches.length === 0) continue;
    const res = await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: buildAlertMessage(watch, matches).slice(0, 1900) }),
    });
    // Only mark as announced when the message really went out, so a failed send is retried next time.
    if (res.ok) {
      await db.update(watches).set({ lastNotifiedAt: now }).where(eq(watches.id, watch.id));
      sent++;
    }
  }
  return { sent, skipped: null };
}
