// Friendly times, like "5 min ago".

export function timeAgo(then: Date, now: Date): string {
  const minutes = Math.max(0, Math.round((now.getTime() - then.getTime()) / 60000));
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

/**
 * A short "ends" label for a deal, or null when there is nothing useful to say
 * (no end date, or it is more than 30 days away).
 */
export function endsLabel(expiresAt: Date | null, now: Date): string | null {
  if (!expiresAt) return null;
  const hours = (expiresAt.getTime() - now.getTime()) / 3600000;
  if (hours <= 0) return "Ended";
  if (hours > 24 * 30) return null;
  if (hours < 1) return "Ends in under 1 hr";
  if (hours < 24) return `Ends in ${Math.round(hours)} hr`;
  const days = Math.round(hours / 24);
  return `Ends in ${days} day${days === 1 ? "" : "s"}`;
}
