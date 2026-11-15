// Everything that draws a deal: the dense table (default), picture cards,
// and the big "Top drops" cards on the home page.

import Link from "next/link";
import { toggleFavorite } from "@/app/actions";
import { ScoreButton } from "@/components/ScoreCard";
import type { DealRow } from "@/db/schema";
import { subcategoryLabel } from "@/lib/categories";
import { DEFAULT_DIR, hrefWith, type Filters, type RawParams, type Sort } from "@/lib/deal-filters";
import { formatCents, percentOff } from "@/lib/money";
import { specLabels, type Specs } from "@/lib/specs";
import { endsLabel, timeAgo } from "@/lib/time";

type ViewProps = { rows: DealRow[]; filters: Filters; raw: RawParams; now: Date };

const NEW_WINDOW_MS = 3 * 3600 * 1000;

function isNew(deal: DealRow, now: Date): boolean {
  return now.getTime() - (deal.sourceUpdatedAt ?? deal.firstSeenAt).getTime() < NEW_WINDOW_MS;
}

/** Each store gets its own steady color, worked out from its name. */
function storeHue(store: string): number {
  let hash = 0;
  for (const ch of store) hash = (hash * 31 + ch.charCodeAt(0)) % 360;
  return hash;
}

function StoreTag({ store }: { store: string }) {
  const color = `hsl(${storeHue(store)} 75% 62%)`;
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
      <span aria-hidden className="h-2 w-2 rounded-full" style={{ background: color, boxShadow: `0 0 8px ${color}` }} />
      {store}
    </span>
  );
}

/**
 * Deal pictures come from many different sites, so we use a plain <img>.
 * Product photos sit whole on a light tile, so nothing gets cropped.
 */
function Thumb({ deal, className }: { deal: DealRow; className: string }) {
  if (!deal.imageUrl) return <div className={`${className} bg-white/5`} aria-hidden />;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={deal.imageUrl} alt="" loading="lazy" referrerPolicy="no-referrer" className={`${className} bg-white object-contain p-1`} />
  );
}

/** Small labels for key specs, like "27″ · 1440p · 165 Hz". */
function SpecChips({ specs }: { specs: Specs | null }) {
  const labels = specLabels(specs);
  if (labels.length === 0) return null;
  return (
    <span className="inline-flex flex-wrap gap-1 align-middle">
      {labels.map((label) => (
        <span
          key={label}
          className="rounded-md border border-cyan-400/20 bg-cyan-400/10 px-1.5 py-0.5 text-[11px] font-medium text-cyan-200"
        >
          {label}
        </span>
      ))}
    </span>
  );
}

/** An amber "Ends in 3 days" note, shown only when the end date is close. */
function EndsNote({ expiresAt, now }: { expiresAt: Date | null; now: Date }) {
  const label = endsLabel(expiresAt, now);
  return label ? <span className="text-xs font-medium text-amber-400">⏳ {label}</span> : null;
}

/** The "real deal" check result, as a badge. The facts behind it come from the source's write-up. */
function VerdictBadge({ deal }: { deal: DealRow }) {
  const avg = deal.insights?.avg90Cents;
  if (deal.verdict === "all-time-low") {
    return (
      <span
        title="The lowest price on record for this item."
        className="rounded-md border border-amber-300/40 bg-amber-300/15 px-1.5 py-0.5 text-[11px] font-bold text-amber-200"
      >
        🏆 Lowest price ever
      </span>
    );
  }
  if (deal.verdict === "below-average" && avg) {
    return (
      <span
        title={`Over the last 90 days it has averaged ${formatCents(avg)}.`}
        className="rounded-md border border-emerald-400/30 bg-emerald-400/10 px-1.5 py-0.5 text-[11px] font-semibold text-emerald-200"
      >
        Cheaper than usual ({formatCents(avg)})
      </span>
    );
  }
  if (deal.verdict === "inflated" && avg) {
    return (
      <span
        title={`It has averaged ${formatCents(avg)} for 90 days, which is about what it costs now.`}
        className="rounded-md border border-rose-400/40 bg-rose-400/10 px-1.5 py-0.5 text-[11px] font-semibold text-rose-200"
      >
        ⚠ Not a real discount
      </span>
    );
  }
  return null;
}

/** The heart button. Click to save a deal; click again to un-save it. */
function Heart({ deal, className = "" }: { deal: DealRow; className?: string }) {
  return (
    <form action={toggleFavorite.bind(null, deal.id)} className={className}>
      <button
        aria-label={deal.favorite ? "Remove from saved" : "Save this deal"}
        aria-pressed={deal.favorite}
        title={deal.favorite ? "Saved. Click to remove." : "Save this deal"}
        className={`grid h-7 w-7 place-items-center rounded-full text-base leading-none transition hover:scale-110 active:scale-95 ${
          deal.favorite ? "text-rose-400 drop-shadow-[0_0_6px_rgb(251_113_133/0.8)]" : "text-zinc-600 hover:text-rose-300"
        }`}
      >
        {deal.favorite ? "♥" : "♡"}
      </button>
    </form>
  );
}

function NewTag() {
  return (
    <span className="rounded-md bg-cyan-400/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-cyan-300">
      New
    </span>
  );
}

/** The discount badge. Bigger discounts get louder colors; 75%+ gets the hot gradient. */
function OffBadge({ off }: { off: number | null }) {
  if (off === null) return <span className="text-zinc-700">—</span>;
  const look =
    off >= 75
      ? "shine bg-gradient-to-r from-rose-500 to-orange-400 text-white shadow-[0_0_14px_-2px_rgb(251_113_133/0.8)]"
      : off >= 50
        ? "bg-emerald-400 text-emerald-950"
        : off >= 25
          ? "bg-emerald-400/20 text-emerald-300"
          : "bg-white/10 text-zinc-300";
  return <span className={`inline-block rounded-md px-1.5 py-0.5 text-xs font-bold tabular-nums ${look}`}>-{off}%</span>;
}

/** A column heading you can click to sort. Clicking the active one flips the direction. */
function SortHeader(props: { sort: Sort; label: string; align?: "right"; filters: Filters; raw: RawParams }) {
  const active = props.filters.sort === props.sort;
  const nextDir = active ? (props.filters.dir === "asc" ? "desc" : "asc") : DEFAULT_DIR[props.sort];
  return (
    <th
      className={`px-3 py-2.5 font-semibold ${props.align === "right" ? "text-right" : ""}`}
      aria-sort={active ? (props.filters.dir === "asc" ? "ascending" : "descending") : undefined}
    >
      <Link
        href={hrefWith(props.raw, { sort: props.sort, dir: nextDir })}
        className={`inline-flex items-center gap-1 transition hover:text-white ${active ? "text-emerald-400" : ""}`}
      >
        {props.label}
        <span aria-hidden>{active ? (props.filters.dir === "asc" ? "▲" : "▼") : ""}</span>
      </Link>
    </th>
  );
}

export function DealTable({ rows, filters, raw, now }: ViewProps) {
  const head = { filters, raw };
  return (
    <div className="glass overflow-x-auto rounded-2xl">
      {/* Fixed column widths: the item column takes what is left and long titles are cut with "…". */}
      <table className="w-full min-w-[920px] table-fixed text-left text-sm">
        <colgroup>
          <col />
          <col className="w-36" />
          <col className="w-28" />
          <col className="w-24" />
          <col className="w-36" />
          <col className="w-20 xl:w-36" />
          <col className="w-24" />
        </colgroup>
        <thead className="border-b border-white/10 text-[11px] uppercase tracking-wider text-zinc-400">
          <tr>
            <SortHeader sort="title" label="Item" {...head} />
            <SortHeader sort="store" label="Store" {...head} />
            <SortHeader sort="price" label="Price" align="right" {...head} />
            <th className="px-3 py-2.5 text-right font-semibold">Was</th>
            <SortHeader sort="off" label="You save" align="right" {...head} />
            <SortHeader sort="best" label="Deal score" align="right" {...head} />
            <SortHeader sort="newest" label="Posted" {...head} />
          </tr>
        </thead>
        <tbody>
          {rows.map((deal) => {
            const off = percentOff(deal.priceCents, deal.listPriceCents);
            const hot = off !== null && off >= 75;
            return (
              <tr
                key={deal.id}
                className={`group border-t border-white/5 transition-colors hover:bg-white/[0.045] ${
                  hot ? "bg-rose-500/[0.04]" : ""
                }`}
              >
                <td className="relative px-3 py-2">
                  {/* A colored bar shows on the left when you point at a row. */}
                  <span
                    aria-hidden
                    className={`absolute inset-y-1 left-0 w-0.5 rounded-full opacity-0 transition group-hover:opacity-100 ${
                      hot ? "bg-rose-400" : "bg-emerald-400"
                    }`}
                  />
                  <div className="flex items-center gap-2">
                    <Heart deal={deal} className="shrink-0" />
                    <Thumb deal={deal} className="h-9 w-16 shrink-0 rounded-md" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <a
                          href={deal.url}
                          target="_blank"
                          rel="noreferrer"
                          className="truncate font-medium transition group-hover:text-emerald-300"
                          title={deal.title}
                        >
                          {deal.title}
                        </a>
                        {isNew(deal, now) && <NewTag />}
                      </div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-zinc-500">
                        <span>{[deal.brand, subcategoryLabel(deal.subcategory)].filter(Boolean).join(" · ")}</span>
                        <SpecChips specs={deal.specs} />
                        <VerdictBadge deal={deal} />
                        <EndsNote expiresAt={deal.expiresAt} now={now} />
                      </div>
                    </div>
                  </div>
                </td>
                <td className="truncate px-3 py-2 text-zinc-300" title={deal.store}>
                  <StoreTag store={deal.store} />
                </td>
                <td className="px-3 py-2 text-right font-mono text-[15px] font-semibold tabular-nums text-emerald-300">
                  {formatCents(deal.priceCents)}
                </td>
                <td className="px-3 py-2 text-right font-mono tabular-nums text-zinc-500 line-through decoration-zinc-600">
                  {off !== null && deal.listPriceCents !== null ? formatCents(deal.listPriceCents) : ""}
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-right">
                  {off !== null && deal.listPriceCents !== null && (
                    <span className="mr-2 font-mono tabular-nums text-zinc-300">
                      {formatCents(deal.listPriceCents - deal.priceCents)}
                    </span>
                  )}
                  <OffBadge off={off} />
                </td>
                <td className="px-3 py-2 text-right">
                  <ScoreButton deal={deal} idPrefix="t" showWord />
                </td>
                <td
                  className="whitespace-nowrap px-3 py-2 text-xs text-zinc-500"
                  title={`Last checked ${deal.lastCheckedAt.toLocaleString("en-US")} · source: ${deal.source}`}
                >
                  {timeAgo(deal.sourceUpdatedAt ?? deal.firstSeenAt, now)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function DealCards({ rows, now }: ViewProps) {
  return (
    <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
      {rows.map((deal, index) => {
        const off = percentOff(deal.priceCents, deal.listPriceCents);
        return (
          <li key={deal.id} className="rise relative" style={{ "--i": index } as React.CSSProperties}>
            {/* The heart sits on top of the card, outside the link, so clicking it does not open the deal. */}
            <Heart deal={deal} className="absolute right-2 top-2 z-10 rounded-full bg-black/60 backdrop-blur" />
            {/* Same for the score: it opens the "why this score" card instead of the deal. */}
            <span className="absolute bottom-8 right-3 z-10">
              <ScoreButton deal={deal} idPrefix="c" />
            </span>
            <a
              href={deal.url}
              target="_blank"
              rel="noreferrer"
              className="glass group flex h-full flex-col overflow-hidden rounded-2xl transition duration-200 hover:-translate-y-1 hover:border-emerald-400/40 hover:shadow-[0_12px_40px_-16px_rgb(52_211_153/0.55)]"
            >
              <div className="relative overflow-hidden">
                <Thumb deal={deal} className="aspect-[16/9] w-full transition duration-300 group-hover:scale-[1.04]" />
                <div className="absolute left-2 top-2 flex gap-1.5">
                  {off !== null && <OffBadge off={off} />}
                  {isNew(deal, now) && <NewTag />}
                </div>
              </div>
              <div className="flex flex-1 flex-col gap-1.5 p-3">
                <p className="line-clamp-2 text-sm font-medium leading-snug" title={deal.title}>
                  {deal.title}
                </p>
                <p className="flex flex-wrap items-center gap-x-2 text-xs text-zinc-400">
                  <StoreTag store={deal.store} />
                  {deal.subcategory && <span className="text-zinc-600">{subcategoryLabel(deal.subcategory)}</span>}
                </p>
                <SpecChips specs={deal.specs} />
                <span>
                  <VerdictBadge deal={deal} />
                </span>
                {/* The "was" price sits above the price, leaving room on the right for the score. */}
                <div className="mt-auto flex flex-col-reverse items-start pr-12 pt-2">
                  <span className="font-mono text-xl font-bold tabular-nums text-emerald-300">
                    {formatCents(deal.priceCents)}
                  </span>
                  {off !== null && deal.listPriceCents !== null && (
                    <span className="font-mono text-xs tabular-nums text-zinc-500 line-through">
                      {formatCents(deal.listPriceCents)}
                    </span>
                  )}

                </div>
                <p className="flex flex-wrap items-center gap-x-2 text-[11px] text-zinc-600">
                  Checked {timeAgo(deal.lastCheckedAt, now)}
                  <EndsNote expiresAt={deal.expiresAt} now={now} />
                </p>
              </div>
            </a>
          </li>
        );
      })}
    </ul>
  );
}

/** The big featured cards at the top of the home page: the steepest real markdowns right now. */
export function TopDrops({ rows, now }: { rows: DealRow[]; now: Date }) {
  if (rows.length === 0) return null;
  return (
    <section aria-label="Top drops" className="mb-6">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-zinc-300">
        <span aria-hidden>🔥</span> Biggest price cuts right now
      </h2>
      <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {rows.map((deal, index) => {
          const off = percentOff(deal.priceCents, deal.listPriceCents) ?? 0;
          const hot = off >= 75;
          return (
            <li key={deal.id} className="rise" style={{ "--i": index } as React.CSSProperties}>
              <a
                href={deal.url}
                target="_blank"
                rel="noreferrer"
                className={`glow-border ${hot ? "hot" : ""} group flex h-full flex-col overflow-hidden`}
              >
                <div className="relative overflow-hidden rounded-t-[15px]">
                  <Thumb deal={deal} className="aspect-[16/8] w-full transition duration-500 group-hover:scale-105" />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0c0e12] via-[#0c0e12]/10 to-transparent" />
                </div>
                <div className="flex flex-1 flex-col gap-2 p-3 pt-1">
                  <div className="flex flex-wrap items-end justify-between gap-x-2 gap-y-1">
                    <span
                      className={`text-3xl font-black leading-none tracking-tight sm:text-4xl xl:text-5xl ${
                        hot ? "text-gradient-hot" : "text-gradient"
                      }`}
                    >
                      -{off}%
                    </span>
                    <span className="text-right leading-tight">
                      {deal.listPriceCents !== null && (
                        <span className="block font-mono text-xs tabular-nums text-zinc-500 line-through">
                          {formatCents(deal.listPriceCents)}
                        </span>
                      )}
                      <span className="font-mono text-base font-bold tabular-nums text-emerald-300 sm:text-xl">
                        {formatCents(deal.priceCents)}
                      </span>
                    </span>
                  </div>
                  <p className="line-clamp-1 text-sm font-semibold" title={deal.title}>
                    {deal.title}
                  </p>
                  <p className="mt-auto flex items-center justify-between text-xs text-zinc-400">
                    <StoreTag store={deal.store} />
                    <span className="hidden text-[11px] text-zinc-600 sm:inline">Checked {timeAgo(deal.lastCheckedAt, now)}</span>
                  </p>
                </div>
              </a>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
