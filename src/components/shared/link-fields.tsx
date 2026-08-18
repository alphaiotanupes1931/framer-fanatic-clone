import { Link2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type LinkValue = { url: string; title: string; description: string };

export function normalizeLink(raw: string): string {
  const t = (raw || "").trim();
  if (!t) return "";
  return /^https?:\/\//i.test(t) ? t : `https://${t}`;
}

export function isValidLink(raw: string): boolean {
  const n = normalizeLink(raw);
  if (!n) return false;
  try { new URL(n); return true; } catch { return false; }
}

export function safeHost(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return url; }
}

/** Optional "add a link" block usable on any post or story composer. */
export function LinkFields({
  value,
  onChange,
  heading = "Add a link (optional)",
}: {
  value: LinkValue;
  onChange: (v: LinkValue) => void;
  heading?: string;
}) {
  const normalized = normalizeLink(value.url);
  const valid = isValidLink(value.url);
  return (
    <div className="space-y-3 rounded-xl border border-neutral-200 bg-neutral-50/60 p-4">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-neutral-600">
        <Link2 className="h-3.5 w-3.5" /> {heading}
      </div>
      <div className="space-y-1.5">
        <Label className="text-sm font-medium">Link URL</Label>
        <Input
          value={value.url}
          onChange={(e) => onChange({ ...value, url: e.target.value })}
          placeholder="https://example.com/page"
          inputMode="url"
        />
        {value.url.trim() && !valid && <p className="text-xs text-red-600">Enter a valid web address.</p>}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">Link title (optional)</Label>
          <Input value={value.title} onChange={(e) => onChange({ ...value, title: e.target.value })} maxLength={140} placeholder="What is this link about?" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">Short description (optional)</Label>
          <Input value={value.description} onChange={(e) => onChange({ ...value, description: e.target.value })} maxLength={200} placeholder="Add a little context" />
        </div>
      </div>
      {valid && <LinkPreviewCard url={normalized} title={value.title} description={value.description} />}
    </div>
  );
}

export function LinkPreviewCard({
  url,
  title,
  description,
  className = "",
}: {
  url: string;
  title?: string | null;
  description?: string | null;
  className?: string;
}) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      onClick={(e) => e.stopPropagation()}
      className={`block rounded-xl border border-neutral-200 bg-white p-4 transition hover:border-[#d4580a] ${className}`}
    >
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">
        <Link2 className="h-3.5 w-3.5" /> {safeHost(url)}
      </div>
      <div className="mt-1 font-semibold text-neutral-900 break-words">{title?.trim() || url}</div>
      {description?.trim() && <div className="mt-0.5 text-sm text-neutral-600 break-words">{description.trim()}</div>}
    </a>
  );
}
