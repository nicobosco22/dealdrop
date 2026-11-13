"use client";
// The "Fetch now" button. Fetching reads many feeds politely (2 seconds apart),
// so it can take close to a minute. The button shows that it is working.

import { useFormStatus } from "react-dom";

export function FetchButton() {
  const { pending } = useFormStatus();
  return (
    <button
      disabled={pending}
      className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-400 to-cyan-400 px-4 py-2 text-sm font-bold text-emerald-950 shadow-[0_0_24px_-6px_rgb(52_211_153/0.8)] transition hover:brightness-110 active:scale-95 disabled:cursor-wait disabled:opacity-80"
    >
      {pending && (
        <span
          aria-hidden
          className="animate-spin rounded-full border-2 border-emerald-950/30 border-t-emerald-950"
          style={{ width: 14, height: 14 }}
        />
      )}
      {pending ? "Fetching… about a minute" : "Fetch now"}
    </button>
  );
}
