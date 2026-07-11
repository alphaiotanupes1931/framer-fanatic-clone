export function stripHtml(s: string | null | undefined): string {
  if (!s) return "";
  return s
    .replace(/&lt;\/?[^&]*(?:&gt;|)/g, " ") // escaped/malformed HTML tags
    .replace(/<[^>]*>/g, " ")               // normal HTML tags
    .replace(/<\/[a-zA-Z][a-zA-Z0-9]*(?:>|$)/g, " ") // malformed closing tags
    .replace(/&nbsp;/g, " ")
    .replace(/&#160;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

export function truncateText(s: string | null | undefined, maxLen: number): string {
  const text = stripHtml(s);
  if (!text) return "";
  if (text.length <= maxLen) return text;
  const trimmed = text.slice(0, maxLen).replace(/\s+\S*$/, "");
  return trimmed.trim() + "...";
}

export function timeAgo(input: string | number | Date | null | undefined): string {
  if (!input) return "";
  const d = input instanceof Date ? input : new Date(input);
  if (isNaN(d.getTime())) return "";
  const diff = Math.max(0, (Date.now() - d.getTime()) / 1000);
  if (diff < 45) return "just now";
  if (diff < 90) return "1m ago";
  const m = Math.round(diff / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.round(h / 24);
  if (days < 7) return `${days}d ago`;
  const now = new Date();
  const sameYear = d.getFullYear() === now.getFullYear();
  return d.toLocaleDateString(undefined, sameYear
    ? { month: "short", day: "numeric" }
    : { month: "short", day: "numeric", year: "numeric" });
}
