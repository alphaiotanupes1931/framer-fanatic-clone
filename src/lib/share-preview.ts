export type SharePreview = {
  type: "post" | "story" | "event" | "video" | "profile" | "organization";
  id: string;
  url: string;
  title?: string | null;
  excerpt?: string | null;
  image?: string | null;
  author?: string | null;
};

const MARKER = "::share::";

export function encodeSharePreview(preview: SharePreview, note?: string): string {
  const payload = MARKER + JSON.stringify(preview);
  const trimmed = (note || "").trim();
  return trimmed ? `${payload}\n${trimmed}` : payload;
}

export function parseSharePreview(content: string): { preview: SharePreview; note: string } | null {
  if (!content || !content.startsWith(MARKER)) return null;
  const rest = content.slice(MARKER.length);
  const nl = rest.indexOf("\n");
  const jsonPart = nl === -1 ? rest : rest.slice(0, nl);
  const note = nl === -1 ? "" : rest.slice(nl + 1);
  try {
    const preview = JSON.parse(jsonPart) as SharePreview;
    if (!preview || !preview.type || !preview.id) return null;
    return { preview, note };
  } catch {
    return null;
  }
}

export async function externalShare(url: string, title?: string, text?: string): Promise<void> {
  if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
    try {
      await navigator.share({ url, title: title || undefined, text: text || undefined });
      return;
    } catch (e) {
      // User cancelled or share failed — fall through to copy.
      if ((e as { name?: string })?.name === "AbortError") return;
    }
  }
  const { toast } = await import("sonner");
  try {
    await navigator.clipboard.writeText(url);
    toast.success("Link copied");
    return;
  } catch {
    // Clipboard can be blocked (embedded frames, repeat calls without a fresh
    // user gesture). Fall back to a legacy copy, then to showing the link.
  }
  try {
    const ta = document.createElement("textarea");
    ta.value = url;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    if (ok) {
      toast.success("Link copied");
      return;
    }
  } catch {
    /* ignore */
  }
  toast.message("Copy this link", { description: url, duration: 10000 });
}