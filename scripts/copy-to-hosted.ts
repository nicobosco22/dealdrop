// One-time move: copies your watchlist and Discord alert setting from the database
// on this computer into the online database, so the public site has them too.
//
// Run with DATABASE_URL set to the online database:  npx tsx scripts/copy-to-hosted.ts
// It only adds what is missing; running it twice changes nothing. Values are never printed.

import path from "node:path";
import { eq } from "drizzle-orm";
import { openDb, openHostedDb } from "@/db/client";
import { settings, watches } from "@/db/schema";
import { WEBHOOK_SETTING } from "@/jobs/notify";

async function main() {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) throw new Error("DATABASE_URL is not set.");
  // Only these watches are copied. Others on this computer were tests.
  const keep = (process.env.WATCHES ?? "").split(",").map((w) => w.trim().toLowerCase()).filter(Boolean);

  const local = await openDb(path.join(process.cwd(), ".data", "pglite"));
  const { db: hosted, close } = await openHostedDb(url);
  try {
    const localWatches = (await local.select().from(watches)).filter((w) => keep.includes(w.keyword.toLowerCase()));
    const already = new Set((await hosted.select().from(watches)).map((w) => w.keyword.toLowerCase()));
    let added = 0;
    for (const w of localWatches) {
      if (already.has(w.keyword.toLowerCase())) continue;
      await hosted.insert(watches).values({ keyword: w.keyword, maxPriceCents: w.maxPriceCents });
      added++;
    }
    console.log(`watches copied: ${added} (asked for: ${keep.join(", ") || "none"})`);

    const [hook] = await local.select().from(settings).where(eq(settings.key, WEBHOOK_SETTING));
    if (hook) {
      await hosted
        .insert(settings)
        .values({ key: WEBHOOK_SETTING, value: hook.value })
        .onConflictDoUpdate({ target: settings.key, set: { value: hook.value } });
      console.log("Discord alert setting copied (value hidden)");
    } else {
      console.log("no Discord alert setting on this computer");
    }
  } finally {
    await close();
  }
}

main()
  // The local database keeps the program alive, so end it once the work is done.
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  });
