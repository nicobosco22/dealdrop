// The main screen: search on top, headline numbers and top drops,
// then filters on the left and deals on the right.

import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { DealCards, DealTable, TopDrops } from "@/components/DealViews";
import { FetchButton } from "@/components/FetchButton";
import { FilterSidebar } from "@/components/FilterSidebar";
import { Logo } from "@/components/Logo";
import { SearchBox } from "@/components/SearchBox";
import { getDb } from "@/db/client";
import { getFacets, getStats, getTopDrops, listDeals, PAGE_LIMIT } from "@/db/queries";
import { CATEGORIES } from "@/lib/categories";
import {
  activeFilterCount,
  hrefWith,
  parseFilters,
  type RawParams,
  type Sort,
} from "@/lib/deal-filters";
import { isOwner } from "@/lib/owner";
import { ownerMode } from "@/lib/owner-token";
import { timeAgo } from "@/lib/time";
import { fetchNow, signOut } from "./actions";

// The sort buttons above the list. (Name and store can still be sorted by clicking the column headings.)
const SORT_BUTTONS: { sort: Sort; label: string }[] = [
  { sort: "best", label: "Best deal" },
  { sort: "newest", label: "Newest" },
  { sort: "price", label: "Lowest price" },
  { sort: "off", label: "Biggest discount" },
];

export default function Home({ searchParams }: PageProps<"/">) {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <DealsBrowser searchParams={searchParams} />
    </Suspense>
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

async function DealsBrowser({ searchParams }: { searchParams: Promise<RawParams> }) {
  // Deals change all the time, so always read them fresh when the page is opened.
  await connection();
  const owner = await isOwner();
  const raw = await searchParams;
  // Favorites belong to the owner, so the "saved" filter does nothing for visitors.
  const filters = { ...parseFilters(raw), ...(owner ? {} : { favorites: false }) };
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
        <Link href="/how-it-works" className="hidden text-sm text-zinc-400 transition hover:text-white lg:block">
          How it works
        </Link>
        {/* Only the owner sees the buttons that change things. */}
        {owner && (
          <>
            <Link
              href="/watchlist"
              className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm font-medium text-zinc-200 transition hover:border-white/25 hover:text-white"
            >
              Watchlist
            </Link>
            <form action={fetchNow}>
              <FetchButton />
            </form>
          </>
        )}
      </header>

      {isHome && (
        <>
          <section aria-label="Right now" className="mb-6">
            <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
              The best deals right now, <span className="text-gradient">ranked</span>.
            </h1>
            <p className="mt-2 max-w-3xl text-sm text-zinc-400">
              Every deal gets a score from 0 to 100. It looks at the discount, the money you save, the price
              history and the store. Higher is better.{" "}
              <Link href="/how-it-works" className="font-medium text-emerald-400 hover:underline">
                How it works
              </Link>
            </p>
            <p className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm text-zinc-300">
              <span>
                <b className="text-gradient text-base font-black tabular-nums">{stats.live.toLocaleString("en-US")}</b> deals
              </span>
              <span>
                <b className="text-base font-black tabular-nums">{stats.stores}</b> stores
              </span>
              {stats.bestOff > 0 && (
                <span>
                  biggest price cut{" "}
                  <b className="text-gradient-hot text-base font-black tabular-nums">-{stats.bestOff}%</b>
                </span>
              )}
              <span>
                <b className="text-base font-black tabular-nums">{stats.newToday.toLocaleString("en-US")}</b> new today
              </span>
            </p>
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
        {owner && (
        <Link
          href={hrefWith(raw, { fav: filters.favorites ? null : "1" })}
          className={`flex shrink-0 items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-medium transition ${
            filters.favorites
              ? "border-rose-400/60 bg-rose-400/15 text-rose-200 shadow-[0_0_20px_-8px_rgb(251_113_133/0.9)]"
              : "border-white/10 bg-white/[0.03] text-zinc-300 hover:border-white/25 hover:text-white"
          }`}
        >
          <span aria-hidden>♥</span> Saved
          <span className={`text-xs tabular-nums ${filters.favorites ? "text-rose-300/80" : "text-zinc-500"}`}>
            {stats.saved}
          </span>
        </Link>
        )}
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
              {SORT_BUTTONS.map(({ sort, label }) => (
                <Link
                  key={sort}
                  href={hrefWith(raw, { sort, dir: null })}
                  className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${
                    filters.sort === sort ? "bg-white/10 text-white" : "text-zinc-400 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  {label}
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
                "No deals yet. The first ones arrive with the next fetch."
              )}
            </div>
          ) : (
            <>
              {/* A wide table is hard to read on a phone, so phones always get cards. */}
              <div className={filters.view === "table" ? "hidden md:block" : ""}>
                <View rows={rows} filters={filters} raw={raw} now={now} owner={owner} />
              </div>
              {filters.view === "table" && (
                <div className="md:hidden">
                  <DealCards rows={rows} filters={filters} raw={raw} now={now} owner={owner} />
                </div>
              )}
            </>
          )}

          <footer className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-600">
            <p>
              Every price comes straight from its source and links back to it. Deals by{" "}
              <a href="https://www.dealnews.com/" target="_blank" rel="noreferrer" className="underline hover:text-zinc-400">
                DealNews
              </a>
              .
            </p>
            {ownerMode(process.env) === "password" &&
              (owner ? (
                <form action={signOut} className="ml-auto">
                  <button className="hover:text-zinc-400">Sign out</button>
                </form>
              ) : (
                <Link href="/login" className="ml-auto hover:text-zinc-400">
                  Owner sign in
                </Link>
              ))}
          </footer>
        </main>
      </div>
    </div>
  );
}
