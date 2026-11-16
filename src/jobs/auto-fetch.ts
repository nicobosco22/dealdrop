// Fetches deals on a timer for as long as the app is running, so watchlist alerts
// can fire without anyone pressing "Fetch now".
// Change the gap with AUTO_FETCH_MINUTES in .env.local (0 turns it off). Default: 15.
//
// This only works while the app is running on this computer. Once DealDrop is online,
// a scheduled job takes over this role.

import { getDb } from "@/db/client";
import { sendAlerts } from "./notify";
import { runFetch } from "./run-fetch";

const timer = globalThis as unknown as { dealdropTimer?: ReturnType<typeof setInterval> };

export function startAutoFetch() {
  // Online, the site runs in short-lived pieces that cannot hold a timer.
  // There, the scheduled job (scripts/fetch.ts) does the fetching instead.
  if (process.env.VERCEL) return;
  const minutes = Number(process.env.AUTO_FETCH_MINUTES || 15);
  if (!Number.isFinite(minutes) || minutes <= 0 || timer.dealdropTimer) return;

  const tick = async () => {
    try {
      const db = await getDb();
      const report = await runFetch(db);
      const alerts = await sendAlerts(db);
      console.log("auto fetch", report, "alerts", alerts);
    } catch (err) {
      console.error("auto fetch failed", err);
    }
  };
  // Never faster than every 5 minutes, to stay polite to the sources.
  timer.dealdropTimer = setInterval(tick, Math.max(minutes, 5) * 60 * 1000);
  console.log(`auto fetch every ${Math.max(minutes, 5)} minutes`);
}
