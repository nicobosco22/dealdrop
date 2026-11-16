// The owner sign-in page. Visitors never need it: deals are open to everyone.

import Link from "next/link";
import { Suspense } from "react";
import { Logo } from "@/components/Logo";
import { signIn } from "../actions";

export const metadata = { title: "Owner sign in · DealDrop" };

const ERRORS: Record<string, string> = {
  wrong: "That password is not right.",
  off: "Owner sign-in is not set up on this site.",
};

async function ErrorNote({ searchParams }: { searchParams: PageProps<"/login">["searchParams"] }) {
  const error = (await searchParams).error;
  const text = typeof error === "string" ? ERRORS[error] : undefined;
  return text ? <p className="rounded-lg bg-rose-400/10 px-3 py-2 text-sm text-rose-200">{text}</p> : null;
}

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-sm flex-col justify-center px-4 pb-24">
      <div className="mb-6 flex justify-center">
        <Logo />
      </div>
      <form action={signIn} className="glass space-y-4 rounded-2xl p-6">
        <div>
          <h1 className="text-xl font-bold">Owner sign in</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Only needed to fetch deals, save favorites, or change the watchlist.
          </p>
        </div>
        <Suspense fallback={null}>
          <ErrorNote searchParams={searchParams} />
        </Suspense>
        <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400">
          Password
          <input
            name="password"
            type="password"
            required
            autoFocus
            autoComplete="current-password"
            className="mt-1 block w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm font-normal normal-case tracking-normal text-foreground outline-none focus:border-emerald-400/60"
          />
        </label>
        <button className="w-full rounded-lg bg-gradient-to-r from-emerald-400 to-cyan-400 px-4 py-2 text-sm font-bold text-emerald-950 transition hover:brightness-110 active:scale-[0.98]">
          Sign in
        </button>
      </form>
      <Link href="/" className="mt-4 text-center text-sm text-zinc-400 transition hover:text-white">
        ← Back to the deals
      </Link>
    </div>
  );
}
