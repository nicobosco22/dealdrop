// The scheduled fetch. A timer (GitHub Actions) runs this every 15 minutes:
// it pulls new deals into the online database and sends any watchlist alerts.
//
// Run by hand with:  npm run fetch
// It needs DATABASE_URL. On your own computer, use the "Fetch now" button instead,
// because the local database can only be opened by one program at a time.

import { openHostedDb } from "@/db/client";
import { sendAlerts } from "@/jobs/notify";
import { runFetch } from "@/jobs/run-fetch";

async function main() {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) {
    console.error("DATABASE_URL is not set. On your own computer, press “Fetch now” in the app instead.");
    process.exit(1);
  }

  const { db, close } = await openHostedDb(url);
  try {
    const report = await runFetch(db);
    console.log("fetch report", JSON.stringify(report));
    const alerts = await sendAlerts(db);
    console.log("alerts", JSON.stringify(alerts));
    // Fail the run if every source failed, so the problem shows up as a red X.
    const results = Object.values(report);
    if (results.length > 0 && results.every((r) => "error" in r)) process.exitCode = 1;
  } finally {
    await close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
