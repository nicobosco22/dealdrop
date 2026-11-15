// The deal score you can click. It opens a small card that explains,
// in plain sentences, why the deal got that score.
//
// The card uses the browser's built-in "popover", so it needs no extra code to
// open, close, or close when you click outside it.

import type { DealRow } from "@/db/schema";
import { formatCents } from "@/lib/money";
import { explainScore } from "@/lib/score";

function ringColor(score: number, known: boolean): string {
  if (!known) return "#52525b";
  return score >= 70 ? "#fb7185" : score >= 50 ? "#34d399" : score >= 30 ? "#22d3ee" : "#a1a1aa";
}

function Ring({ score, color, size }: { score: number; color: string; size: "sm" | "lg" }) {
  const outer = size === "lg" ? "h-16 w-16 text-xl" : "h-9 w-9 text-xs";
  const inner = size === "lg" ? "h-[52px] w-[52px]" : "h-7 w-7";
  return (
    <span
      className={`inline-grid shrink-0 place-items-center rounded-full font-bold tabular-nums ${outer}`}
      style={{ background: `conic-gradient(${color} ${score * 3.6}deg, rgb(255 255 255 / 0.08) 0deg)` }}
    >
      <span className={`grid place-items-center rounded-full bg-[#0c0e12] ${inner}`}>{score}</span>
    </span>
  );
}

/**
 * `idPrefix` keeps ids unique when the same deal is drawn twice on one page
 * (once in the table, once in the phone cards).
 */
export function ScoreButton({ deal, idPrefix, showWord = false }: { deal: DealRow; idPrefix: string; showWord?: boolean }) {
  const why = explainScore(deal);
  const known = why.word !== "No price info";
  const color = ringColor(why.score, known);
  const id = `${idPrefix}-score-${deal.id}`;

  return (
    <>
      <button
        type="button"
        popoverTarget={id}
        aria-label={`Deal score ${why.score} out of 100, ${why.word}. Show why.`}
        title="Why this score?"
        className="inline-flex items-center gap-2 rounded-full transition hover:scale-105 focus-visible:outline-2 focus-visible:outline-emerald-400"
      >
        {showWord && (
          <span className="hidden text-right text-[11px] font-medium leading-tight text-zinc-400 xl:block">{why.word}</span>
        )}
        <Ring score={why.score} color={color} size="sm" />
      </button>

      <div
        id={id}
        popover="auto"
        className="m-auto w-[min(92vw,27rem)] rounded-2xl border border-white/10 bg-[#0c0e12] p-5 text-left text-sm font-normal text-foreground shadow-2xl backdrop:bg-black/60 backdrop:backdrop-blur-sm"
      >
        <div className="flex items-center gap-4">
          <Ring score={why.score} color={color} size="lg" />
          <div className="min-w-0">
            <p className="text-lg font-bold" style={{ color }}>
              {why.word}
            </p>
            <p className="text-xs text-zinc-400">Deal score: {why.score} out of 100</p>
          </div>
          <button
            type="button"
            popoverTarget={id}
            popoverTargetAction="hide"
            aria-label="Close"
            className="ml-auto grid h-8 w-8 shrink-0 place-items-center self-start rounded-full text-lg text-zinc-400 transition hover:bg-white/10 hover:text-white"
          >
            ×
          </button>
        </div>

        <p className="mt-3 line-clamp-2 font-medium">{deal.title}</p>
        <p className="mt-0.5 text-xs text-zinc-400">
          {formatCents(deal.priceCents)} at {deal.store}
        </p>

        {why.warning && (
          <p className="mt-3 rounded-lg border border-rose-400/30 bg-rose-400/10 px-3 py-2 text-rose-200">⚠ {why.warning}</p>
        )}

        <ul className="mt-4 space-y-3">
          {why.lines.map((line) => (
            <li key={line.label}>
              <div className="flex items-baseline justify-between gap-3">
                <span className="font-semibold">{line.label}</span>
                <span className="font-mono text-xs tabular-nums text-zinc-400">
                  {line.points} / {line.max}
                </span>
              </div>
              {/* A bar that fills up with the points earned. */}
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-cyan-400"
                  style={{ width: `${(line.points / line.max) * 100}%` }}
                />
              </div>
              <p className="mt-1 text-zinc-400">{line.text}</p>
            </li>
          ))}
        </ul>

        <a
          href={deal.url}
          target="_blank"
          rel="noreferrer"
          className="mt-5 block rounded-xl bg-gradient-to-r from-emerald-400 to-cyan-400 px-4 py-2.5 text-center font-bold text-emerald-950 transition hover:brightness-110"
        >
          See this deal ↗
        </a>
        <p className="mt-2 text-center text-[11px] text-zinc-500">
          Prices and price history as reported by {deal.source === "dealnews" ? "DealNews" : deal.source}.
        </p>
      </div>
    </>
  );
}
