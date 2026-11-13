// The main screen: search on top, filters on the left, deals on the right.

import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { DealCards, DealTable } from "@/components/DealViews";
import { FilterSidebar } from "@/components/FilterSidebar";
import { getDb } from "@/db/client";
import { getFacets, listDeals, PAGE_LIMIT } from "@/db/queries";
import { hrefWith, parseFilters, SORTS, type RawParams, type Sort } from "@/lib/deal-filters";
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
    <Suspense fallback={<p className="p-6 text-zinc-400">Loading deals…</p>}>
      <DealsBrowser searchParams={searchParams} />
    </Suspense>
  );
}

async function DealsBrowser({ searchParams }: { searchParams: Promise<RawParams> }) {
  // Deals change all the time, so always read them fresh when the page is opened.
  await connection();
  const raw = await searchParams;
  const filters = parseFilters(raw);
  const db = await getDb();
  const [{ rows, total }, facets] = await Promise.all([listDeals(db, filters), getFacets(db)]);
  const now = new Date();
  const View = filters.view === "cards" ? DealCards : DealTable;

  return (
    <div className="mx-auto w-full max-w-[1800px] px-4 pb-10">
      <header className="sticky top-0 z-10 -mx-4 mb-4 flex flex-wrap items-center gap-3 border-b border-zinc-800 bg-background/95 px-4 py-3 backdrop-blur">
        <Link href="/" className="text-xl font-bold tracking-tight">
          Deal<span className="text-emerald-400">Drop</span>
        </Link>
        {/* This box belongs to the filter form in the sidebar (form="filters"),
            so searching keeps your filters and filtering keeps your search. */}
        <input
          key={filters.q}
          form="filters"
          name="q"
          type="search"
          defaultValue={filters.q}
          placeholder="Search deals…"
          aria-label="Search deals"
          className="order-last w-full min-w-0 flex-1 rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-sm outline-none focus:border-emerald-500 sm:order-none sm:w-auto"
        />
        <span className="ml-auto text-xs text-zinc-500 sm:ml-0">
          {facets.lastCheckedAt ? `Checked ${timeAgo(facets.lastCheckedAt, now)}` : "Not checked yet"}
        </span>
        <form action={fetchNow}>
          <button className="rounded-md border border-zinc-700 px-3 py-1.5 text-sm hover:bg-zinc-800">
            Fetch now
          </button>
        </form>
      </header>

      <div className="gap-6 lg:grid lg:grid-cols-[240px_minmax(0,1fr)]">
        <aside className="mb-4 lg:sticky lg:top-20 lg:mb-0 lg:max-h-[calc(100vh-6rem)] lg:self-start lg:overflow-y-auto lg:pr-2">
          <FilterSidebar filters={filters} facets={facets} />
        </aside>

        <main className="min-w-0">
          <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
            <p className="text-zinc-400">
              <span className="font-semibold text-foreground">{total.toLocaleString("en-US")}</span>{" "}
              {total === 1 ? "deal" : "deals"}
              {total > rows.length ? ` (showing the first ${PAGE_LIMIT})` : ""}
            </p>

            <nav aria-label="Sort" className="flex flex-wrap items-center gap-1">
              <span className="mr-1 text-xs text-zinc-500">Sort</span>
              {SORTS.map((sort) => (
                <Link
                  key={sort}
                  href={hrefWith(raw, { sort, dir: null })}
                  className={`rounded px-2 py-1 text-xs ${
                    filters.sort === sort ? "bg-zinc-800 text-white" : "text-zinc-400 hover:text-white"
                  }`}
                >
                  {SORT_LABELS[sort]}
                </Link>
              ))}
            </nav>

            <nav aria-label="View" className="ml-auto hidden overflow-hidden md:flex rounded-md border border-zinc-700 text-xs">
              <Link
                href={hrefWith(raw, { view: null })}
                className={`px-3 py-1 ${filters.view === "table" ? "bg-zinc-800 text-white" : "text-zinc-400 hover:text-white"}`}
              >
                Table
              </Link>
              <Link
                href={hrefWith(raw, { view: "cards" })}
                className={`px-3 py-1 ${filters.view === "cards" ? "bg-zinc-800 text-white" : "text-zinc-400 hover:text-white"}`}
              >
                Cards
              </Link>
            </nav>
          </div>

          {rows.length === 0 ? (
            <div className="rounded-lg border border-dashed border-zinc-800 p-10 text-center text-zinc-400">
              {facets.lastCheckedAt ? (
                <>
                  No deals match these filters.{" "}
                  <Link href="/" className="text-emerald-400 hover:underline">
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

          <p className="mt-4 text-xs text-zinc-600">
            Every price comes straight from its source and links back to it. Game prices by CheapShark. Store
            deals by DealNews.
          </p>
        </main>
      </div>
    </div>
  );
}
