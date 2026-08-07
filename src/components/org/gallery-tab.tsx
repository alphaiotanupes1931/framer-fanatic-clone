import { useEffect, useState } from "react";
import { Image as ImageIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SmartImage } from "@/components/smart-image";

export function GalleryTab({ orgId }: { orgId: string }) {
  const [urls, setUrls] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("organization_posts")
        .select("media_url, media_urls, created_at")
        .eq("org_id", orgId)
        .order("created_at", { ascending: false })
        .limit(120);
      const out: string[] = [];
      for (const row of (data ?? []) as { media_url: string | null; media_urls: unknown }[]) {
        const many = Array.isArray(row.media_urls) ? (row.media_urls as string[]) : [];
        for (const u of many) if (typeof u === "string" && u) out.push(u);
        if (row.media_url) out.push(row.media_url);
      }
      setUrls(Array.from(new Set(out)));
      setLoading(false);
    })();
  }, [orgId]);

  if (loading) return <div className="py-14 text-center text-sm text-neutral-500">Loading gallery...</div>;
  if (!urls.length) {
    return (
      <div className="rounded-2xl border border-dashed border-border py-16 text-center">
        <ImageIcon className="mx-auto mb-3 h-8 w-8 text-neutral-400" />
        <p className="text-sm text-neutral-600">No photos yet.</p>
        <p className="mt-1 text-xs text-neutral-500">Photos added to posts show up here automatically.</p>
      </div>
    );
  }
  return (
    <div className="grid grid-cols-2 gap-3 py-2 sm:grid-cols-3">
      {urls.map((u) => (
        <div key={u} className="overflow-hidden rounded-xl border border-border bg-muted">
          <SmartImage src={u} alt="Gallery photo" className="aspect-square w-full object-cover" />
        </div>
      ))}
    </div>
  );
}
