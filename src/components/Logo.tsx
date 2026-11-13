// The DealDrop logo: a price tag shaped like a falling drop.

import Link from "next/link";

export function Logo() {
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
