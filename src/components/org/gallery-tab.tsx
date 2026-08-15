import { useEffect, useState } from "react";
import { Image as ImageIcon, ChevronLeft, ChevronRight, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SmartImage } from "@/components/smart-image";

type Work = { url: string; title: string | null; body: string | null };

export function GalleryTab({ orgId }: { orgId: string }) {
  const [works, setWorks] = useState<Work[]>([]);
  const [loading, setLoading] = useState(true);
  const [idx, setIdx] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("organization_posts")
        .select("title, body, media_url, media_urls, created_at")
        .eq("org_id", orgId)
        .order("created_at", { ascending: false })
        .limit(120);
      const out: Work[] = [];
      const seen = new Set<string>();
      for (const row of (data ?? []) as { title: string | null; body: string | null; media_url: string | null; media_urls: unknown }[]) {
        const many = Array.isArray(row.media_urls) ? (row.media_urls as string[]) : [];
        const all = [...many, row.media_url].filter((u): u is string => typeof u === "string" && !!u);
        for (const u of all) {
          if (seen.has(u) || /\.(mp4|webm|mov|m4v)(\?|$)/i.test(u)) continue;
          seen.add(u);
          out.push({ url: u, title: row.title ?? null, body: row.body ?? null });
        }
      }
      setWorks(out);
      setLoading(false);
    })();
  }, [orgId]);

  const lot = (i: number) => `LOT ${String(i + 1).padStart(2, "0")}`;
  const active = idx !== null ? works[idx] : null;

  if (loading) return <div className="py-14 text-center text-sm text-neutral-500">Loading portfolio...</div>;
  if (!works.length) {
    return (
      <div className="rounded-2xl border border-dashed border-border py-16 text-center">
        <ImageIcon className="mx-auto mb-3 h-8 w-8 text-neutral-400" />
        <p className="text-sm text-neutral-600">No photos yet.</p>
        <p className="mt-1 text-xs text-neutral-500">Photos added to posts show up here automatically.</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-6 py-2 sm:grid-cols-2 lg:grid-cols-3">
        {works.map((w, i) => (
          <button
            key={w.url}
            type="button"
            onClick={() => setIdx(i)}
            className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card text-left"
          >
            <div className="px-5 pt-5 text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">{lot(i)}</div>
            <div className="flex flex-1 items-center justify-center px-5 py-5">
              <SmartImage src={w.url} alt={w.title ?? "Portfolio work"} className="max-h-[340px] w-full object-contain transition duration-300 group-hover:scale-[1.02]" />
            </div>
            {w.title && (
              <div className="border-t border-border px-5 py-4">
                <div className="truncate font-serif text-lg italic leading-snug text-foreground">{w.title}</div>
              </div>
            )}
          </button>
        ))}
      </div>

      {active && idx !== null && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-3 sm:p-6" onClick={() => setIdx(null)}>
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative grid max-h-[94vh] w-full max-w-6xl grid-cols-1 overflow-hidden rounded-2xl bg-background shadow-2xl md:grid-cols-[minmax(0,1.4fr)_minmax(300px,420px)]"
          >
            <div className="flex items-center justify-center bg-background p-4">
              <SmartImage src={active.url} alt={active.title ?? ""} className="max-h-[86vh] w-full object-contain" />
            </div>
            <div className="max-h-[86vh] overflow-y-auto border-t border-border p-6 md:border-l md:border-t-0">
              <div className="flex items-start justify-between gap-3">
                <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">{lot(idx)}</div>
                <button onClick={() => setIdx(null)} aria-label="Close" className="rounded-full border border-border p-1.5 hover:bg-muted">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <h3 className="mt-3 font-serif text-3xl italic leading-tight">{active.title || "Untitled"}</h3>
              {active.body && <p className="mt-5 whitespace-pre-wrap text-base leading-relaxed text-foreground/90">{active.body}</p>}
            </div>
            {idx > 0 && (
              <button onClick={() => setIdx(idx - 1)} aria-label="Previous work" className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-background/90 p-2 shadow hover:bg-background">
                <ChevronLeft className="h-5 w-5" />
              </button>
            )}
            {idx < works.length - 1 && (
              <button onClick={() => setIdx(idx + 1)} aria-label="Next work" className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-background/90 p-2 shadow hover:bg-background md:right-[calc(300px+0.75rem)]">
                <ChevronRight className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}
