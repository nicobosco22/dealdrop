"use client";
// The filter sidebar. It is a plain form: choosing something reloads the page
// with the choice in the address, and the server does the filtering.

import Link from "next/link";
import { useState } from "react";
import type { Facets } from "@/db/queries";
import { CATEGORIES, TECH_SUBCATEGORIES } from "@/lib/categories";
import { activeFilterCount, PANELS, RESOLUTIONS, type Filters } from "@/lib/deal-filters";

const OFF_CHOICES = [10, 25, 50, 75];

export function FilterSidebar({ filters, facets }: { filters: Filters; facets: Facets }) {
  const [open, setOpen] = useState(false);
  const active = activeFilterCount(filters);
  const dollars = (cents: number | null) => (cents === null ? "" : String(cents / 100));

  return (
    <form
      id="filters"
      method="get"
      action="/"
      className="text-sm"
      // Ticking a box or picking from a list applies right away. Typed prices wait for Apply / Enter.
      onChange={(e) => {
        const el = e.target as unknown as HTMLInputElement;
        if (el.type === "radio" || el.type === "checkbox" || el.tagName === "SELECT") {
          e.currentTarget.requestSubmit();
        }
      }}
    >
      {/* Keep the current sort and view when filters change. */}
      <input type="hidden" name="sort" value={filters.sort} />
      <input type="hidden" name="dir" value={filters.dir} />
      {filters.view === "cards" && <input type="hidden" name="view" value="cards" />}

      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="glass mb-3 w-full rounded-xl px-4 py-2.5 text-left font-semibold lg:hidden"
      >
        Filters{active ? ` (${active})` : ""} <span className="float-right">{open ? "▲" : "▼"}</span>
      </button>

      {/* The key makes the boxes redraw when filters change from outside (for example "Clear"). */}
      <div key={JSON.stringify(filters)} className={`${open ? "block" : "hidden"} glass space-y-5 rounded-2xl p-4 lg:block`}>
        <Section title="Category">
          <Radio name="cat" value="" checked={!filters.category} label="All" />
          {CATEGORIES.map((c) => (
            <div key={c.id}>
              <Radio
                name="cat"
                value={c.id}
                checked={filters.category === c.id}
                label={c.label}
                count={facets.categories[c.id] ?? 0}
              />
              {c.id === "technology" && filters.category === "technology" && (
                <div className="ml-5 mt-1 space-y-1 border-l border-white/10 pl-3">
                  <Radio name="sub" value="" checked={!filters.subcategory} label="All tech" />
                  {TECH_SUBCATEGORIES.map((s) => (
                    <Radio
                      key={s.id}
                      name="sub"
                      value={s.id}
                      checked={filters.subcategory === s.id}
                      label={s.label}
                      count={facets.subcategories[s.id] ?? 0}
                    />
                  ))}
                </div>
              )}
            </div>
          ))}
        </Section>

        {/* Spec filters appear only inside the subcategory they belong to. */}
        {filters.subcategory === "monitors" && (
          <Section title="Monitor specs">
            <Pick name="res" label="Resolution" value={filters.resolution} options={RESOLUTIONS.map((r) => [r, r])} />
            <Pick name="panel" label="Panel type" value={filters.panel} options={PANELS.map((p) => [p, p])} />
            <Pick
              name="hz"
              label="Refresh rate"
              value={filters.minHz}
              options={[60, 100, 120, 144, 165, 240, 360].map((n) => [String(n), `${n} Hz or more`])}
            />
            <Pick
              name="size"
              label="Screen size"
              value={filters.minSize}
              options={[24, 27, 32, 34, 40, 49].map((n) => [String(n), `${n}″ or bigger`])}
            />
          </Section>
        )}
        {filters.subcategory === "gaming-gear" && (
          <Section title="Gear specs">
            <Pick
              name="conn"
              label="Connection"
              value={filters.connection}
              options={[
                ["wireless", "Wireless"],
                ["wired", "Wired"],
              ]}
            />
          </Section>
        )}
        {filters.subcategory === "pc-parts" && (
          <Section title="Graphics card specs">
            <Pick
              name="vram"
              label="Memory (VRAM)"
              value={filters.minVram}
              options={[8, 12, 16, 24].map((n) => [String(n), `${n} GB or more`])}
            />
          </Section>
        )}

        <Section title="Price">
          <div className="flex items-center gap-2">
            <PriceBox name="min" placeholder="Min" defaultValue={dollars(filters.minCents)} />
            <span className="text-zinc-500">to</span>
            <PriceBox name="max" placeholder="Max" defaultValue={dollars(filters.maxCents)} />
          </div>
        </Section>

        <Section title="Discount">
          <select
            name="off"
            defaultValue={filters.minOff ?? ""}
            aria-label="Minimum percent off"
            className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1.5 outline-none focus:border-emerald-400/60"
          >
            <option value="">Any</option>
            {OFF_CHOICES.map((n) => (
              <option key={n} value={n}>
                {n}% off or more
              </option>
            ))}
          </select>
        </Section>

        <Section title="Store">
          <div className="max-h-64 space-y-1 overflow-y-auto pr-1">
            {facets.stores.length === 0 && <p className="text-zinc-500">No stores yet.</p>}
            {facets.stores.map((s) => (
              <label key={s.name} className="flex cursor-pointer items-center gap-2 rounded-md px-1 py-0.5 transition hover:bg-white/5 hover:text-white">
                <input
                  type="checkbox"
                  name="store"
                  value={s.name}
                  defaultChecked={filters.stores.includes(s.name)}
                  className="accent-emerald-400"
                />
                <span className="flex-1 truncate">{s.name}</span>
                <span className="text-xs text-zinc-500">{s.count}</span>
              </label>
            ))}
          </div>
        </Section>

        <div className="flex gap-2">
          <button className="flex-1 rounded-lg bg-emerald-400 px-3 py-1.5 font-bold text-emerald-950 transition hover:brightness-110 active:scale-95">
            Apply
          </button>
          <Link
            href={filters.view === "cards" ? "/?view=cards" : "/"}
            className="rounded-lg border border-white/10 px-3 py-1.5 text-zinc-300 transition hover:bg-white/10"
          >
            Clear
          </Link>
        </div>
      </div>
    </form>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset>
      <legend className="mb-2 text-[11px] font-bold uppercase tracking-wider text-zinc-400">{title}</legend>
      <div className="space-y-1">{children}</div>
    </fieldset>
  );
}

function Radio(props: { name: string; value: string; checked: boolean; label: string; count?: number }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 rounded-md px-1 py-0.5 transition hover:bg-white/5 hover:text-white">
      <input
        type="radio"
        name={props.name}
        value={props.value}
        defaultChecked={props.checked}
        className="accent-emerald-400"
      />
      <span className="flex-1">{props.label}</span>
      {props.count !== undefined && <span className="text-xs text-zinc-500">{props.count}</span>}
    </label>
  );
}

/** A small labelled drop-down list with an "Any" choice on top. */
function Pick(props: {
  name: string;
  label: string;
  value: string | number | null;
  options: (readonly [string, string])[];
}) {
  return (
    <label className="flex items-center gap-2">
      <span className="w-24 shrink-0 text-zinc-400">{props.label}</span>
      <select
        name={props.name}
        defaultValue={props.value ?? ""}
        className="min-w-0 flex-1 rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1 outline-none focus:border-emerald-400/60"
      >
        <option value="">Any</option>
        {props.options.map(([value, text]) => (
          <option key={value} value={value}>
            {text}
          </option>
        ))}
      </select>
    </label>
  );
}

function PriceBox(props: { name: string; placeholder: string; defaultValue: string }) {
  return (
    <label className="flex flex-1 items-center rounded-lg border border-white/10 bg-white/[0.04] px-2 focus-within:border-emerald-400/60">
      <span className="text-zinc-500">$</span>
      <input
        name={props.name}
        inputMode="decimal"
        placeholder={props.placeholder}
        aria-label={`${props.placeholder} price`}
        defaultValue={props.defaultValue}
        className="w-full min-w-0 bg-transparent px-1 py-1.5 outline-none"
      />
    </label>
  );
}
