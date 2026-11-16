// The owner sign-in, kept deliberately small: one password, set as OWNER_PASSWORD.
// When you sign in, the browser gets a cookie holding a scrambled form of the password.
// The password itself is never stored in the cookie.

import { createHmac, timingSafeEqual } from "node:crypto";

export const OWNER_COOKIE = "dealdrop_owner";

/** The cookie value that proves someone knows the password. */
export function tokenFor(password: string): string {
  return createHmac("sha256", password).update("dealdrop-owner-session-v1").digest("hex");
}

/** Compares two strings without leaking, through timing, how much of them matched. */
export function sameText(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export type OwnerMode = "open" | "locked" | "password";

/**
 * How the site is protected:
 *  - "password": OWNER_PASSWORD is set. Only someone signed in can change things.
 *  - "open":     no password, running on your own computer. Everything is allowed.
 *  - "locked":   no password on the public site. Nobody can change anything.
 */
export function ownerMode(env: { OWNER_PASSWORD?: string; NODE_ENV?: string }): OwnerMode {
  if (env.OWNER_PASSWORD?.trim()) return "password";
  return env.NODE_ENV === "production" ? "locked" : "open";
}

/** Is this cookie value the owner's? */
export function isOwnerCookie(cookie: string | undefined, env: { OWNER_PASSWORD?: string; NODE_ENV?: string }): boolean {
  const mode = ownerMode(env);
  if (mode === "open") return true;
  if (mode === "locked" || !cookie) return false;
  return sameText(cookie, tokenFor(env.OWNER_PASSWORD!.trim()));
}
