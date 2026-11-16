"use server";
// Things the pages can ask the server to do.

import { eq, not } from "drizzle-orm";
import { refresh } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getDb } from "@/db/client";
import { deals, settings, watches } from "@/db/schema";
import { checkWebhook, sendAlerts, sendTestAlert, WEBHOOK_SETTING } from "@/jobs/notify";
import { runFetch } from "@/jobs/run-fetch";
import { parsePriceToCents } from "@/lib/money";
import { requireOwner } from "@/lib/owner";
import { isOwnerCookie, OWNER_COOKIE, ownerMode, tokenFor } from "@/lib/owner-token";

/** The "Fetch now" button: pull from every source, send any watchlist alerts, then redraw the page. */
export async function fetchNow() {
  await requireOwner();
  const db = await getDb();
  const report = await runFetch(db);
  const alerts = await sendAlerts(db);
  console.log("fetch report", report, "alerts", alerts);
  refresh();
}

/** The heart button: save a deal, or un-save it if it was saved. */
export async function toggleFavorite(dealId: number) {
  await requireOwner();
  const db = await getDb();
  await db.update(deals).set({ favorite: not(deals.favorite) }).where(eq(deals.id, dealId));
  refresh();
}

/** Add a watch from the watchlist form. Blank or over-long keywords are ignored. */
export async function addWatch(formData: FormData) {
  await requireOwner();
  const keyword = String(formData.get("keyword") ?? "").trim().replace(/\s+/g, " ").slice(0, 80);
  if (!keyword) return;
  const maxPriceCents = parsePriceToCents(String(formData.get("max") ?? ""));
  const db = await getDb();
  await db.insert(watches).values({ keyword, maxPriceCents: maxPriceCents || null });
  refresh();
}

export async function removeWatch(watchId: number) {
  await requireOwner();
  const db = await getDb();
  await db.delete(watches).where(eq(watches.id, watchId));
  refresh();
}

/** The "Send test alert" button on the Watchlist page. The result shows in a banner. */
export async function testAlert() {
  await requireOwner();
  const result = await sendTestAlert(await getDb());
  redirect(`/watchlist?test=${result}`);
}

/**
 * Saves the Discord webhook address pasted into the Watchlist page.
 * It is checked first, stored in the local database, and never shown back on screen.
 */
export async function saveWebhook(formData: FormData) {
  await requireOwner();
  const { status, url } = checkWebhook(String(formData.get("webhook") ?? ""));
  if (!url) redirect(`/watchlist?test=${status}`);
  const db = await getDb();
  await db
    .insert(settings)
    .values({ key: WEBHOOK_SETTING, value: url })
    .onConflictDoUpdate({ target: settings.key, set: { value: url } });
  redirect("/watchlist?test=saved");
}

/** Turns Discord alerts off by forgetting the saved address. */
export async function removeWebhook() {
  await requireOwner();
  const db = await getDb();
  await db.delete(settings).where(eq(settings.key, WEBHOOK_SETTING));
  redirect("/watchlist?test=removed");
}

/** The sign-in form. A wrong password waits a second, to slow down guessing. */
export async function signIn(formData: FormData) {
  const password = String(formData.get("password") ?? "");
  if (ownerMode(process.env) !== "password") redirect("/login?error=off");
  const token = tokenFor(password);
  if (!isOwnerCookie(token, process.env)) {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    redirect("/login?error=wrong");
  }
  (await cookies()).set(OWNER_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  redirect("/");
}

export async function signOut() {
  (await cookies()).delete(OWNER_COOKIE);
  redirect("/");
}
