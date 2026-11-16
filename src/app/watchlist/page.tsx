// The watchlist: words you want DealDrop to keep an eye out for, each with an optional top price.

import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { Logo } from "@/components/Logo";
import { getDb } from "@/db/client";
import { listWatches } from "@/db/queries";
import { formatCents, percentOff } from "@/lib/money";
import { getWebhook } from "@/jobs/notify";
import { requireOwner } from "@/lib/owner";
import { addWatch, removeWatch, removeWebhook, saveWebhook, testAlert } from "../actions";

export const metadata = { title: "Watchlist · DealDrop" };

const TEST_RESULTS: Record<string, { text: string; good: boolean }> = {
  saved: { text: "Address saved. Press “Send test alert” to check it works.", good: true },
  removed: { text: "Address removed. Discord alerts are off.", good: true },
  sent: { text: "Test alert sent. Check your Discord channel.", good: true },
  failed: { text: "Discord did not accept the message. Check that the webhook still exists.", good: false },
  missing: { text: "No address was entered, so nothing was saved or sent.", good: false },
  "not-discord": {
    text: "That is not a Discord webhook address. It should start with https://discord.com/api/webhooks/",
    good: false,
  },
};

/** Shows whether alerts are switched on, lets you paste the address, and send a test. Never shows the address. */
async function AlertStatus({ searchParams }: { searchParams: PageProps<"/watchlist">["searchParams"] }) {
  await connection();
  await requireOwner();
  const test = (await searchParams).test;
  const result = typeof test === "string" ? TEST_RESULTS[test] : undefined;
  const { status } = await getWebhook(await getDb());
  const on = status === "ready";
  const fromFile = Boolean(process.env.DISCORD_WEBHOOK_URL?.trim());

  return (
    <section className="glass mt-5 rounded-2xl p-4 text-sm">
      <div className="flex flex-wrap items-center gap-3">
        <span className={`h-2.5 w-2.5 rounded-full ${on ? "bg-emerald-400 shadow-[0_0_10px_rgb(52_211_153)]" : "bg-zinc-600"}`} />
        <p className="min-w-0 flex-1">
          <span className="font-semibold">{on ? "Discord alerts are on." : "Discord alerts are off."}</span>{" "}
          <span className="text-zinc-400">
            {on
              ? "New matches are posted to your channel after each fetch."
              : "Paste your Discord webhook address below to get a message when a new deal matches."}
          </span>
        </p>
        {on && (
          <>
            <form action={testAlert}>
              <button className="rounded-lg border border-white/10 px-3 py-1.5 font-medium text-zinc-200 transition hover:border-emerald-400/50 hover:text-white">
                Send test alert
              </button>
            </form>
            {!fromFile && (
              <form action={removeWebhook}>
                <button className="rounded-lg border border-white/10 px-3 py-1.5 text-zinc-400 transition hover:border-rose-400/50 hover:text-rose-300">
                  Turn off
                </button>
              </form>
            )}
          </>
        )}
      </div>

      {!on && (
        <form action={saveWebhook} className="mt-3 flex flex-wrap items-end gap-3">
          <label className="min-w-0 flex-1 text-xs font-semibold uppercase tracking-wider text-zinc-400">
            Discord webhook address
            {/* A password box, so the address is hidden as you paste it. */}
            <input
              name="webhook"
              type="password"
              required
              autoComplete="off"
              placeholder="https://discord.com/api/webhooks/…"
              className="mt-1 block w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm font-normal normal-case tracking-normal text-foreground outline-none focus:border-emerald-400/60"
            />
          </label>
          <button className="rounded-lg bg-emerald-400 px-4 py-2 text-sm font-bold text-emerald-950 transition hover:brightness-110 active:scale-95">
            Save address
          </button>
        </form>
      )}
      {!on && (
        <p className="mt-2 text-xs text-zinc-500">
          In Discord: hover a channel → gear icon → Integrations → Webhooks → New Webhook → Copy Webhook URL. The
          address is kept on this computer and is never shown again.
        </p>
      )}

      {result && (
        <p className={`mt-3 rounded-lg px-3 py-2 ${result.good ? "bg-emerald-400/10 text-emerald-200" : "bg-rose-400/10 text-rose-200"}`}>
          {result.text}
        </p>
      )}
    </section>
  );
}

export default function WatchlistPage({ searchParams }: PageProps<"/watchlist">) {
  return (
    <div className="mx-auto w-full max-w-4xl px-4 pb-12">
      <header className="sticky top-0 z-20 -mx-4 mb-6 flex items-center gap-4 border-b border-white/10 bg-background/70 px-4 py-3 backdrop-blur-xl">
        <Logo />
        <Link href="/" className="ml-auto text-sm text-zinc-400 transition hover:text-white">
          ← All deals
        </Link>
      </header>

      <h1 className="text-3xl font-black tracking-tight">
        Your <span className="text-gradient">watchlist</span>
      </h1>
      <p className="mt-1 text-sm text-zinc-400">
        Add words to watch for, like “oled monitor” or “lego star wars”. Every word must be in the deal’s title. Set
        a top price if you only care below a certain amount.
      </p>

      <form action={addWatch} className="glass mt-5 flex flex-wrap items-end gap-3 rounded-2xl p-4">
        <label className="min-w-0 flex-1 text-xs font-semibold uppercase tracking-wider text-zinc-400">
          Watch for
          <input
            name="keyword"
            required
            maxLength={80}
            placeholder="wireless gaming mouse"
            className="mt-1 block w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm font-normal normal-case tracking-normal text-foreground outline-none focus:border-emerald-400/60"
          />
        </label>
        <label className="w-32 text-xs font-semibold uppercase tracking-wider text-zinc-400">
          Top price
          <span className="mt-1 flex items-center rounded-lg border border-white/10 bg-white/[0.04] px-2 focus-within:border-emerald-400/60">
            <span className="text-zinc-500">$</span>
            <input
              name="max"
              inputMode="decimal"
              placeholder="any"
              className="w-full min-w-0 bg-transparent px-1 py-2 text-sm font-normal text-foreground outline-none"
            />
          </span>
        </label>
        <button className="rounded-lg bg-gradient-to-r from-emerald-400 to-cyan-400 px-4 py-2 text-sm font-bold text-emerald-950 transition hover:brightness-110 active:scale-95">
          Add watch
        </button>
      </form>

      <Suspense fallback={null}>
        <AlertStatus searchParams={searchParams} />
      </Suspense>

      <Suspense fallback={<p className="mt-6 text-zinc-400">Loading your watchlist…</p>}>
        <Watches />
      </Suspense>
    </div>
  );
}

async function Watches() {
  await connection();
  await requireOwner();
  const db = await getDb();
  const watches = await listWatches(db);

  if (watches.length === 0) {
    return (
      <p className="glass mt-6 rounded-2xl border-dashed p-10 text-center text-zinc-400">
        Nothing on your watchlist yet. Add your first one above.
      </p>
    );
  }

  return (
    <ul className="mt-6 space-y-3">
      {watches.map((watch) => {
        const max = watch.maxPriceCents !== null ? String(watch.maxPriceCents / 100) : "";
        const seeAll = `/?${new URLSearchParams({ q: watch.keyword, ...(max ? { max } : {}) })}`;
        return (
          <li key={watch.id} className="glass rounded-2xl p-4">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <h2 className="text-lg font-bold">“{watch.keyword}”</h2>
              {watch.maxPriceCents !== null && (
                <span className="rounded-md bg-white/10 px-2 py-0.5 text-xs text-zinc-300">
                  under {formatCents(watch.maxPriceCents)}
                </span>
              )}
              <span
                className={`rounded-md px-2 py-0.5 text-xs font-semibold ${
                  watch.matchCount > 0 ? "bg-emerald-400/15 text-emerald-300" : "bg-white/5 text-zinc-500"
                }`}
              >
                {watch.matchCount} {watch.matchCount === 1 ? "match" : "matches"}
              </span>
              {watch.newCount > 0 && (
                <span className="rounded-md bg-cyan-400/15 px-2 py-0.5 text-xs font-bold text-cyan-300">
                  {watch.newCount} new today
                </span>
              )}
              <form action={removeWatch.bind(null, watch.id)} className="ml-auto">
                <button className="rounded-lg border border-white/10 px-3 py-1 text-xs text-zinc-400 transition hover:border-rose-400/50 hover:text-rose-300">
                  Remove
                </button>
              </form>
            </div>

            {watch.top.length > 0 ? (
              <>
                <ul className="mt-3 divide-y divide-white/5">
                  {watch.top.map((deal) => {
                    const off = percentOff(deal.priceCents, deal.listPriceCents);
                    return (
                      <li key={deal.id} className="flex items-center gap-3 py-2 text-sm">
                        <span className="w-24 shrink-0 font-mono font-semibold tabular-nums text-emerald-300">
                          {formatCents(deal.priceCents)}
                        </span>
                        <a
                          href={deal.url}
                          target="_blank"
                          rel="noreferrer"
                          className="min-w-0 flex-1 truncate transition hover:text-emerald-300"
                          title={deal.title}
                        >
                          {deal.title}
                        </a>
                        {off !== null && <span className="shrink-0 text-xs font-semibold text-emerald-300">-{off}%</span>}
                        <span className="hidden shrink-0 text-xs text-zinc-500 sm:inline">{deal.store}</span>
                      </li>
                    );
                  })}
                </ul>
                {watch.matchCount > watch.top.length && (
                  <Link href={seeAll} className="mt-2 inline-block text-sm font-medium text-emerald-400 hover:underline">
                    See all {watch.matchCount} matches →
                  </Link>
                )}
              </>
            ) : (
              <p className="mt-2 text-sm text-zinc-500">No matching deals right now. DealDrop keeps looking on every fetch.</p>
            )}
          </li>
        );
      })}
    </ul>
  );
}
