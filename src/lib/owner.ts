// Checks whether the person using the site is the owner (signed in with the password).
// Visitors can look at deals. Only the owner can fetch, save deals, or touch the watchlist.

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { isOwnerCookie, OWNER_COOKIE } from "./owner-token";

export async function isOwner(): Promise<boolean> {
  const cookie = (await cookies()).get(OWNER_COOKIE)?.value;
  return isOwnerCookie(cookie, process.env);
}

/** Put this at the top of anything only the owner may do. Everyone else is sent to the sign-in page. */
export async function requireOwner(): Promise<void> {
  if (!(await isOwner())) redirect("/login");
}
