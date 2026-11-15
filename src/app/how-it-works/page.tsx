// A short, plain explanation of what DealDrop does and what the score means.

import Link from "next/link";
import { Logo } from "@/components/Logo";

export const metadata = { title: "How it works · DealDrop" };

const STEPS = [
  {
    title: "It collects deals",
    text: "Every 15 minutes DealDrop reads deal feeds and saves each deal with its price, store, link and the time it was checked. It never makes up a price.",
  },
  {
    title: "It keeps only what you care about",
    text: "Technology, house items, furniture and LEGO. Cases, cables, spare parts, video games and other toys are thrown out.",
  },
  {
    title: "It scores every deal from 0 to 100",
    text: "The score adds up four things. Click the score on any deal to see exactly how it was worked out.",
  },
  {
    title: "It tells you when something you want shows up",
    text: "Put words on your watchlist, like “oled monitor”. When a new deal matches, DealDrop messages your Discord channel.",
  },
];

const PARTS = [
  { name: "Discount", max: 35, text: "How far below the usual price it is. 70% off or more earns all 35." },
  { name: "Money saved", max: 15, text: "Saving $300 counts for more than saving $10." },
  { name: "Price history", max: 35, text: "Is it the lowest price on record? Is it cheaper than its 90-day average?" },
  { name: "Store", max: 15, text: "Big, well-known stores score higher than marketplaces with unknown sellers." },
];

const BADGES = [
  { look: "border-amber-300/40 bg-amber-300/15 text-amber-200", label: "🏆 Lowest price ever", text: "The lowest price on record for this item." },
  { look: "border-emerald-400/30 bg-emerald-400/10 text-emerald-200", label: "Cheaper than usual", text: "The price is below its 90-day average." },
  { look: "border-rose-400/40 bg-rose-400/10 text-rose-200", label: "⚠ Not a real discount", text: "It claims a big discount, but it has cost about this much for 90 days." },
  { look: "border-transparent bg-cyan-400/15 text-cyan-300", label: "NEW", text: "Posted in the last 3 hours." },
];

export default function HowItWorksPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 pb-16">
      <header className="sticky top-0 z-20 -mx-4 mb-8 flex items-center gap-4 border-b border-white/10 bg-background/70 px-4 py-3 backdrop-blur-xl">
        <Logo />
        <Link href="/" className="ml-auto text-sm text-zinc-400 transition hover:text-white">
          ← All deals
        </Link>
      </header>

      <h1 className="text-4xl font-black tracking-tight">
        How <span className="text-gradient">DealDrop</span> works
      </h1>
      <p className="mt-2 text-zinc-400">Four steps, no fine print.</p>

      <ol className="mt-8 space-y-4">
        {STEPS.map((step, index) => (
          <li key={step.title} className="glass flex gap-4 rounded-2xl p-5">
            <span className="text-gradient text-4xl font-black leading-none tabular-nums">{index + 1}</span>
            <div>
              <h2 className="text-lg font-bold">{step.title}</h2>
              <p className="mt-1 text-sm text-zinc-400">{step.text}</p>
            </div>
          </li>
        ))}
      </ol>

      <h2 className="mt-12 text-2xl font-black tracking-tight">What goes into the score</h2>
      <ul className="mt-4 space-y-3">
        {PARTS.map((part) => (
          <li key={part.name} className="glass rounded-2xl p-4">
            <div className="flex items-baseline justify-between gap-3">
              <span className="font-bold">{part.name}</span>
              <span className="font-mono text-xs text-zinc-400">up to {part.max} points</span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-cyan-400" style={{ width: `${part.max}%` }} />
            </div>
            <p className="mt-2 text-sm text-zinc-400">{part.text}</p>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-sm text-zinc-500">
        70 or more is a great deal. 50 or more is a good deal. If a deal has no usual price and no price history,
        DealDrop says “No price info” instead of guessing.
      </p>

      <h2 className="mt-12 text-2xl font-black tracking-tight">What the labels mean</h2>
      <ul className="mt-4 space-y-3">
        {BADGES.map((badge) => (
          <li key={badge.label} className="flex flex-wrap items-center gap-3 text-sm">
            <span className={`rounded-md border px-2 py-0.5 text-xs font-bold ${badge.look}`}>{badge.label}</span>
            <span className="text-zinc-400">{badge.text}</span>
          </li>
        ))}
      </ul>

      <p className="mt-12 text-xs text-zinc-600">
        Prices, usual prices and price history come from DealNews write-ups and link back to them. DealDrop’s own
        price history starts the day it first sees a deal.
      </p>
    </div>
  );
}
