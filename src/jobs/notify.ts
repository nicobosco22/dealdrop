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

export type WebhookStatus = "ready" | "missing" | "not-discord";

/**
 * Looks at DISCORD_WEBHOOK_URL. Only real Discord webhook addresses are accepted,
 * so a typo can never make DealDrop post your watchlist to some other website.
 */
export function readWebhook(): { status: WebhookStatus; url: string | null } {
  const url = process.env.DISCORD_WEBHOOK_URL?.trim();
  if (!url) return { status: "missing", url: null };
  const ok = /^https:\/\/(?:(?:canary|ptb)\.)?discord(?:app)?\.com\/api\/webhooks\/\d+\/[\w-]+$/.test(url);
  return ok ? { status: "ready", url } : { status: "not-discord", url: null };
}

async function post(url: string, content: string): Promise<boolean> {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: content.slice(0, 1900) }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** The "Send test alert" button. Says what happened without ever revealing the address. */
export async function sendTestAlert(): Promise<"sent" | "failed" | WebhookStatus> {
  const { status, url } = readWebhook();
  if (!url) return status;
  const ok = await post(url, "DealDrop test alert: your watchlist alerts are working.");
  return ok ? "sent" : "failed";
}

export type AlertReport = { sent: number; skipped: "no webhook set" | null };

export async function sendAlerts(db: Db, now: Date = new Date()): Promise<AlertReport> {
  const { url: webhook } = readWebhook();
  if (!webhook) return { sent: 0, skipped: "no webhook set" };

  let sent = 0;
  for (const watch of await db.select().from(watches)) {
    const matches = await findNewMatches(db, watch, now);
    if (matches.length === 0) continue;
    // Only mark as announced when the message really went out, so a failed send is retried next time.
    if (await post(webhook, buildAlertMessage(watch, matches))) {
      await db.update(watches).set({ lastNotifiedAt: now }).where(eq(watches.id, watch.id));
      sent++;
    }
  }
  return { sent, skipped: null };
}
