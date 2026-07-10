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
