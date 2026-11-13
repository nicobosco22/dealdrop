// The main screen: search on top, headline numbers and top drops,
// then filters on the left and deals on the right.

import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { DealCards, DealTable, TopDrops } from "@/components/DealViews";
import { FilterSidebar } from "@/components/FilterSidebar";
import { SearchBox } from "@/components/SearchBox";
import { getDb } from "@/db/client";
import { getFacets, getStats, getTopDrops, listDeals, PAGE_LIMIT } from "@/db/queries";
import { CATEGORIES } from "@/lib/categories";
import {
  activeFilterCount,
  hrefWith,
  parseFilters,
  SORTS,
  type RawParams,
  type Sort,
} from "@/lib/deal-filters";
import { timeAgo } from "@/lib/time";
import { fetchNow } from "./actions";

const SORT_LABELS: Record<Sort, string> = {
  newest: "Newest",
  price: "Price",
  off: "% off",
  saved: "$ saved",
  title: "Name",
  store: "Store",
};

export default function Home({ searchParams }: PageProps<"/">) {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <DealsBrowser searchParams={searchParams} />
    </Suspense>
  );
}

function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2 text-xl font-black tracking-tight">
      {/* A price tag shaped like a falling drop. */}
      <svg viewBox="0 0 32 32" className="h-7 w-7 drop-shadow-[0_0_10px_rgb(52_211_153/0.7)]" aria-hidden>
        <defs>
          <linearGradient id="logo-fill" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#34d399" />
            <stop offset="1" stopColor="#22d3ee" />
          </linearGradient>
        </defs>
        <path d="M16 2c5 7 10 11.5 10 17.5a10 10 0 0 1-20 0C6 13.500 11 9 16 2Z" fill="url(#logo-fill)" />
        <path d="m12 23 8-8M12.500 16.500h.01M19.500 22.500h.01" stroke="#06070a" strokeWidth="2.400" strokeLinecap="round" />
      </svg>
      <span>
        Deal<span className="text-gradient">Drop</span>
      </span>
    </Link>
  );
}

function LoadingScreen() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-zinc-400">
      <span className="live-dot" />
      Loading deals…
    </div>
  );
}

function StatTile(props: { label: string; value: string; href?: string; tone?: "accent" | "hot" }) {
  const number = (
    <span
      className={`text-2xl font-black tabular-nums sm:text-3xl ${
        props.tone === "hot" ? "text-gradient-hot" : props.tone === "accent" ? "text-gradient" : ""
      }`}
    >
      {props.value}
    </span>
  );
  const body = (
    <>
      {number}
      <span className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">{props.label}</span>
    </>
  );
  const shape = "glass flex flex-col gap-0.5 rounded-2xl px-4 py-3";
  return props.href ? (
    <Link href={props.href} className={`${shape} transition hover:border-white/20 hover:bg-white/[0.06]`}>
      {body}
    </Link>
  ) : (
    <div className={shape}>{body}</div>
  );
}

async function DealsBrowser({ searchParams }: { searchParams: Promise<RawParams> }) {
  // Deals change all the time, so always read them fresh when the page is opened.
  await connection();
  const raw = await searchParams;
  const filters = parseFilters(raw);
  const db = await getDb();
  const now = new Date();
  // The hero (numbers + top drops) only shows on the plain home view, not while filtering.
  const isHome = !filters.q && activeFilterCount(filters) === 0;
  const [{ rows, total }, facets, stats, topDrops] = await Promise.all([
    listDeals(db, filters, now),
    getFacets(db),
    getStats(db, now),
    isHome ? getTopDrops(db, 4, now) : Promise.resolve([]),
  ]);
  const View = filters.view === "cards" ? DealCards : DealTable;

  return (
    <div className="mx-auto w-full max-w-[1800px] px-4 pb-12">
      <header className="sticky top-0 z-20 -mx-4 mb-5 flex flex-wrap items-center gap-x-4 gap-y-3 border-b border-white/10 bg-background/70 px-4 py-3 backdrop-blur-xl">
        <Logo />
        <SearchBox key={filters.q} defaultValue={filters.q} />
        <span className="ml-auto flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-zinc-400 sm:ml-0">
          <span className="live-dot" />
          {facets.lastCheckedAt ? `Checked ${timeAgo(facets.lastCheckedAt, now)}` : "Not checked yet"}
        </span>
        <form action={fetchNow}>
          <button className="rounded-xl bg-gradient-to-r from-emerald-400 to-cyan-400 px-4 py-2 text-sm font-bold text-emerald-950 shadow-[0_0_24px_-6px_rgb(52_211_153/0.8)] transition hover:brightness-110 active:scale-95">
            Fetch now
          </button>
        </form>
      </header>

      {isHome && (
        <>
          <section aria-label="Right now" className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatTile label="Live deals" value={stats.live.toLocaleString("en-US")} tone="accent" />
            <StatTile label="Stores tracked" value={String(stats.stores)} />
            <StatTile
              label="Biggest drop"
              value={stats.bestOff > 0 ? `-${stats.bestOff}%` : "—"}
              tone="hot"
              href="/?sort=off"
            />
            <StatTile label="New in 24 hours" value={stats.newToday.toLocaleString("en-US")} />
          </section>
          <TopDrops rows={topDrops} now={now} />
        </>
      )}

      {/* Quick category tabs. The sidebar has the same choices plus everything else. */}
      <nav aria-label="Categories" className="mb-5 flex gap-2 overflow-x-auto pb-1">
        {[{ id: null, label: "All deals" }, ...CATEGORIES].map((c) => {
          const active = filters.category === c.id;
          const count = c.id ? (facets.categories[c.id] ?? 0) : stats.live;
          return (
            <Link
              key={c.label}
              href={hrefWith(raw, { cat: c.id, sub: null })}
              className={`flex shrink-0 items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-medium transition ${
                active
                  ? "border-emerald-400/60 bg-emerald-400/15 text-emerald-200 shadow-[0_0_20px_-8px_rgb(52_211_153/0.9)]"
                  : "border-white/10 bg-white/[0.03] text-zinc-300 hover:border-white/25 hover:text-white"
              }`}
            >
              {c.label}
              <span className={`text-xs tabular-nums ${active ? "text-emerald-300/80" : "text-zinc-500"}`}>{count}</span>
            </Link>
          );
        })}
      </nav>

      <div className="gap-6 lg:grid lg:grid-cols-[250px_minmax(0,1fr)]">
        <aside className="mb-4 lg:sticky lg:top-20 lg:mb-0 lg:max-h-[calc(100vh-6rem)] lg:self-start lg:overflow-y-auto lg:pr-1">
          <FilterSidebar filters={filters} facets={facets} />
        </aside>

        <main className="min-w-0">
          <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
            <p className="text-zinc-400">
              <span className="text-lg font-bold text-foreground">{total.toLocaleString("en-US")}</span>{" "}
              {total === 1 ? "deal" : "deals"}
              {total > rows.length ? ` (showing the first ${PAGE_LIMIT})` : ""}
            </p>

            <nav aria-label="Sort" className="flex flex-wrap items-center gap-1">
              <span className="mr-1 text-xs text-zinc-500">Sort</span>
              {SORTS.map((sort) => (
                <Link
                  key={sort}
                  href={hrefWith(raw, { sort, dir: null })}
                  className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${
                    filters.sort === sort ? "bg-white/10 text-white" : "text-zinc-400 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  {SORT_LABELS[sort]}
                </Link>
              ))}
            </nav>

            <nav
              aria-label="View"
              className="ml-auto hidden overflow-hidden rounded-lg border border-white/10 text-xs font-medium md:flex"
            >
              <Link
                href={hrefWith(raw, { view: null })}
                className={`px-3 py-1.5 transition ${filters.view === "table" ? "bg-white/10 text-white" : "text-zinc-400 hover:text-white"}`}
              >
                Table
              </Link>
              <Link
                href={hrefWith(raw, { view: "cards" })}
                className={`px-3 py-1.5 transition ${filters.view === "cards" ? "bg-white/10 text-white" : "text-zinc-400 hover:text-white"}`}
              >
                Cards
              </Link>
            </nav>
          </div>

          {rows.length === 0 ? (
            <div className="glass rounded-2xl border-dashed p-12 text-center text-zinc-400">
              {facets.lastCheckedAt ? (
                <>
                  No deals match these filters.{" "}
                  <Link href="/" className="font-medium text-emerald-400 hover:underline">
                    Clear filters
                  </Link>
                </>
              ) : (
                "No deals saved yet. Press “Fetch now”."
              )}
            </div>
          ) : (
            <>
              {/* A wide table is hard to read on a phone, so phones always get cards. */}
              <div className={filters.view === "table" ? "hidden md:block" : ""}>
                <View rows={rows} filters={filters} raw={raw} now={now} />
              </div>
              {filters.view === "table" && (
                <div className="md:hidden">
                  <DealCards rows={rows} filters={filters} raw={raw} now={now} />
                </div>
              )}
            </>
          )}

          <p className="mt-5 text-xs text-zinc-600">
            Every price comes straight from its source and links back to it. Store deals by DealNews.
          </p>
        </main>
      </div>
    </div>
  );
}
