import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppLayout } from "@/components/app-layout";
import { HeroBanner } from "@/components/shared/hero-banner";
import { EventCard } from "@/components/shared/event-card";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useCachedFetch } from "@/hooks/use-cached-fetch";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/festivals")({
  component: FestivalsPage,
  head: () =>
    pageHead({
      path: "/festivals",
      title: "Baltimore Festivals | Planet Baltimore",
      description: "Street fairs, block parties and citywide festivals happening around Baltimore.",
    }),
});

type Row = {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  starts_at: string | null;
  venue_name: string | null;
  neighborhood: string | null;
  category: string | null;
  user_id: string | null;
};

function FestivalsPage() {
  const [q, setQ] = useState("");
  const { data } = useCachedFetch<Row[]>("pb:festivals:v1", async () => {
    const { data } = await supabase
      .from("events")
      .select("id,title,description,image_url,starts_at,venue_name,neighborhood,category,user_id")
      .eq("is_published", true)
      .gte("starts_at", new Date(Date.now() - 12 * 3600 * 1000).toISOString())
      .order("starts_at", { ascending: true })
      .limit(200);
    const rows = (data as Row[] | null) ?? [];
    return rows.filter(
      (r) =>
        /festival/i.test(r.category ?? "") ||
        /festival|fest\b|block party|street fair/i.test(r.title ?? ""),
    );
  });

  const rows = useMemo(() => {
    const list = data ?? [];
    const term = q.trim().toLowerCase();
    if (!term) return list;
    return list.filter(
      (r) =>
        (r.title ?? "").toLowerCase().includes(term) ||
        (r.neighborhood ?? "").toLowerCase().includes(term) ||
        (r.venue_name ?? "").toLowerCase().includes(term),
    );
  }, [data, q]);

  return (
    <AppLayout>
      <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6">
        <HeroBanner title="Festivals" subtitle="Street fairs, block parties and citywide celebrations." />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search festivals by name, neighborhood or venue"
          className="max-w-md"
        />
        {rows.length === 0 ? (
          <div className="rounded-xl border border-border bg-card px-5 py-12 text-center text-sm text-muted-foreground">
            No festivals listed yet. Check back soon.
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {rows.map((e) => (
              <EventCard key={e.id} event={e} />
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
