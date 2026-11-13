"use client";
// The search box in the header. Press "/" anywhere to jump into it.

import { useEffect, useRef } from "react";

export function SearchBox({ defaultValue }: { defaultValue: string }) {
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const typing = ["INPUT", "TEXTAREA", "SELECT"].includes((e.target as HTMLElement).tagName);
      if (e.key === "/" && !typing && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        ref.current?.focus();
        ref.current?.select();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <label className="group relative order-last w-full min-w-0 flex-1 sm:order-none sm:w-auto">
      <svg
        viewBox="0 0 24 24"
        aria-hidden
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500 group-focus-within:text-emerald-400"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      >
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
      </svg>
      {/* form="filters" ties this box to the sidebar form, so search and filters work together. */}
      <input
        ref={ref}
        form="filters"
        name="q"
        type="search"
        defaultValue={defaultValue}
        placeholder="Search deals, like “oled monitor” or “air fryer”"
        aria-label="Search deals"
        className="w-full rounded-xl border border-white/10 bg-white/[0.04] py-2 pl-9 pr-10 text-sm outline-none transition placeholder:text-zinc-500 focus:border-emerald-400/60 focus:bg-white/[0.06] focus:shadow-[0_0_0_4px_rgb(52_211_153/0.12)]"
      />
      <kbd className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded border border-white/10 bg-white/5 px-1.5 font-mono text-[11px] text-zinc-400 group-focus-within:hidden sm:block">
        /
      </kbd>
    </label>
  );
}
