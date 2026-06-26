const ALLOWED = new Set([
  "musician","podcaster","visual artist","photographer","videographer",
  "filmmaker","fashion designer","graphic designer","writer","poet",
  "dancer","dj","producer","comedian","chef / culinary","tattoo artist",
  "muralist","curator","event organizer","artist",
]);

/**
 * Normalizes a stored profile category into a display label.
 * Legacy values like "resident" or "business_owner" collapse to "Artist".
 * Returns null for attendees so callers can hide the badge entirely.
 */
export function formatCategory(category?: string | null, role?: string | null): string | null {
  const c = (category ?? "").trim().toLowerCase();
  if (!c || c === "attendee") {
    return role === "artist" ? "Artist" : null;
  }
  if (!ALLOWED.has(c)) return "Artist";
  return c.replace(/\b\w/g, (m) => m.toUpperCase());
}