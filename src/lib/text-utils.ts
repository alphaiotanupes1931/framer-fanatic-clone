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
