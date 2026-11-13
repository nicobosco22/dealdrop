// The two ways to look at deals: a dense table (default) and picture cards.

import Link from "next/link";
import type { DealRow } from "@/db/schema";
import { subcategoryLabel } from "@/lib/categories";
import { DEFAULT_DIR, hrefWith, type Filters, type RawParams, type Sort } from "@/lib/deal-filters";
import { formatCents, percentOff } from "@/lib/money";
import { timeAgo } from "@/lib/time";

type ViewProps = { rows: DealRow[]; filters: Filters; raw: RawParams; now: Date };

/** Deal pictures come from many different sites, so we use a plain <img>. */
function Thumb({ deal, className }: { deal: DealRow; className: string }) {
  if (!deal.imageUrl) return <div className={`${className} bg-zinc-800`} aria-hidden />;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={deal.imageUrl} alt="" loading="lazy" referrerPolicy="no-referrer" className={className} />;
}

function OffBadge({ off }: { off: number | null }) {
  if (off === null) return <span className="text-zinc-600">—</span>;
  const strong = off >= 50;
  return (
    <span
      className={`rounded px-1.5 py-0.5 text-xs font-semibold ${
        strong ? "bg-emerald-500/20 text-emerald-300" : "bg-zinc-800 text-zinc-300"
      }`}
    >
      -{off}%
    </span>
  );
}

/** A column heading you can click to sort. Clicking the active one flips the direction. */
function SortHeader(props: { sort: Sort; label: string; align?: "right"; filters: Filters; raw: RawParams }) {
  const active = props.filters.sort === props.sort;
  const nextDir = active ? (props.filters.dir === "asc" ? "desc" : "asc") : DEFAULT_DIR[props.sort];
  return (
    <th
      className={`px-3 py-2 font-medium ${props.align === "right" ? "text-right" : ""}`}
      aria-sort={active ? (props.filters.dir === "asc" ? "ascending" : "descending") : undefined}
    >
      <Link
        href={hrefWith(props.raw, { sort: props.sort, dir: nextDir })}
        className={`inline-flex items-center gap-1 hover:text-white ${active ? "text-emerald-400" : ""}`}
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
    <div className="overflow-x-auto rounded-lg border border-zinc-800">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead className="bg-zinc-900 text-xs uppercase tracking-wide text-zinc-400">
          <tr>
            <SortHeader sort="title" label="Item" {...head} />
            <SortHeader sort="store" label="Store" {...head} />
            <SortHeader sort="price" label="Price" align="right" {...head} />
            <th className="px-3 py-2 text-right font-medium">Was</th>
            <SortHeader sort="off" label="% off" align="right" {...head} />
            <SortHeader sort="saved" label="Saved" align="right" {...head} />
            <SortHeader sort="newest" label="Updated" {...head} />
          </tr>
        </thead>
        <tbody>
          {rows.map((deal) => {
            const off = percentOff(deal.priceCents, deal.listPriceCents);
            return (
              <tr key={deal.id} className="border-t border-zinc-800/80 hover:bg-zinc-900/70">
                <td className="px-3 py-1.5">
                  <div className="flex items-center gap-3">
                    <Thumb deal={deal} className="h-8 w-16 shrink-0 rounded object-cover" />
                    <div className="min-w-0">
                      <a
                        href={deal.url}
                        target="_blank"
                        rel="noreferrer"
                        className="block truncate font-medium hover:underline"
                        title={deal.title}
                      >
                        {deal.title}
                      </a>
                      <span className="text-xs text-zinc-500">{subcategoryLabel(deal.subcategory)}</span>
                    </div>
                  </div>
                </td>
                <td className="whitespace-nowrap px-3 py-1.5 text-zinc-300">{deal.store}</td>
                <td className="px-3 py-1.5 text-right font-semibold tabular-nums text-emerald-400">
                  {formatCents(deal.priceCents)}
                </td>
                <td className="px-3 py-1.5 text-right tabular-nums text-zinc-500 line-through">
                  {off !== null && deal.listPriceCents !== null ? formatCents(deal.listPriceCents) : ""}
                </td>
                <td className="px-3 py-1.5 text-right">
                  <OffBadge off={off} />
                </td>
                <td className="px-3 py-1.5 text-right tabular-nums text-zinc-300">
                  {off !== null && deal.listPriceCents !== null
                    ? formatCents(deal.listPriceCents - deal.priceCents)
                    : ""}
                </td>
                <td
                  className="whitespace-nowrap px-3 py-1.5 text-xs text-zinc-500"
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
      {rows.map((deal) => {
        const off = percentOff(deal.priceCents, deal.listPriceCents);
        return (
          <li key={deal.id}>
            <a
              href={deal.url}
              target="_blank"
              rel="noreferrer"
              className="flex h-full flex-col overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900/50 hover:border-zinc-600"
            >
              <Thumb deal={deal} className="aspect-[231/87] w-full object-cover" />
              <div className="flex flex-1 flex-col gap-1 p-3">
                <p className="line-clamp-2 text-sm font-medium" title={deal.title}>
                  {deal.title}
                </p>
                <p className="text-xs text-zinc-500">
                  {deal.store}
                  {deal.subcategory ? ` · ${subcategoryLabel(deal.subcategory)}` : ""}
                </p>
                <div className="mt-auto flex items-baseline gap-2 pt-2">
                  <span className="text-lg font-semibold tabular-nums text-emerald-400">
                    {formatCents(deal.priceCents)}
                  </span>
                  {off !== null && deal.listPriceCents !== null && (
                    <span className="text-xs tabular-nums text-zinc-500 line-through">
                      {formatCents(deal.listPriceCents)}
                    </span>
                  )}
                  <span className="ml-auto">
                    <OffBadge off={off} />
                  </span>
                </div>
                <p className="text-xs text-zinc-600">Checked {timeAgo(deal.lastCheckedAt, now)}</p>
              </div>
            </a>
          </li>
        );
      })}
    </ul>
  );
}
